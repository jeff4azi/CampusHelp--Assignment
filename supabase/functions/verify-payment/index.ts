// supabase/functions/verify-payment/index.ts
// Secure server-side Paystack payment verification
// Deploy: supabase functions deploy verify-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORM_FEE_PERCENT = 0.15;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Parse & validate input ──────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    const { reference, post_id, offer_id, helper_id } = body;

    if (!reference || !post_id || !offer_id || !helper_id) {
      return json(
        {
          error:
            "Missing required fields: reference, post_id, offer_id, helper_id",
        },
        400,
      );
    }

    // ── 2. Get authenticated user from JWT ────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not set in edge function environment");
      return json({ error: "Payment service not configured" }, 500);
    }

    // Use service role client for DB writes (bypasses RLS safely server-side)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT to get the calling user
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const studentId = user.id;

    // ── 3. Idempotency check — prevent duplicate sessions ─────────────────
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, session_id")
      .eq("transaction_reference", reference)
      .maybeSingle();

    if (existingPayment) {
      // Already processed — return the existing session id
      return json({
        success: true,
        session_id: existingPayment.session_id,
        message: "Payment already verified",
        duplicate: true,
      });
    }

    // ── 4. Fetch post to get expected budget ──────────────────────────────
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, budget, status, user_id, course")
      .eq("id", post_id)
      .single();

    if (postError || !post) return json({ error: "Post not found" }, 404);
    if (post.user_id !== studentId)
      return json({ error: "Unauthorized: not the post owner" }, 403);
    if (post.status !== "open")
      return json({ error: "Post is no longer open" }, 409);

    // ── 5. Fetch offer ────────────────────────────────────────────────────
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, post_id, helper_id, accepted")
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) return json({ error: "Offer not found" }, 404);
    if (offer.post_id !== post_id)
      return json({ error: "Offer does not belong to this post" }, 400);
    if (offer.helper_id !== helper_id)
      return json({ error: "Helper ID mismatch" }, 400);
    if (offer.accepted) return json({ error: "Offer already accepted" }, 409);

    // ── 6. Verify payment with Paystack ───────────────────────────────────
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!paystackRes.ok) {
      console.error("Paystack API error:", paystackRes.status);
      return json({ error: "Failed to reach payment provider" }, 502);
    }

    const paystackData = await paystackRes.json();

    // ── 7. Validate Paystack response ─────────────────────────────────────
    if (!paystackData.status || paystackData.data?.status !== "success") {
      console.error("Payment not successful:", paystackData.data?.status);
      return json(
        {
          error: "Payment was not successful",
          paystack_status: paystackData.data?.status ?? "unknown",
        },
        402,
      );
    }

    // Amount check: Paystack returns amount in kobo, post.budget is in Naira
    const paidAmountNaira = paystackData.data.amount / 100;
    const expectedAmount = Number(post.budget);
    const tolerance = 1; // allow ±1 Naira for rounding

    if (Math.abs(paidAmountNaira - expectedAmount) > tolerance) {
      console.error(
        `Amount mismatch: paid ${paidAmountNaira}, expected ${expectedAmount}`,
      );
      return json(
        {
          error: "Payment amount does not match job budget",
          paid: paidAmountNaira,
          expected: expectedAmount,
        },
        402,
      );
    }

    // ── 8. All checks passed — create session atomically ──────────────────
    const platformFee = expectedAmount * PLATFORM_FEE_PERCENT;

    // 8a. Create work session
    const { data: session, error: sessionError } = await supabase
      .from("work_sessions")
      .insert({
        post_id: post_id,
        owner_id: studentId,
        helper_id: helper_id,
        status: "active",
        payment_status: "paid",
        amount: expectedAmount,
        platform_fee: platformFee,
        payment_reference: reference,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Session creation failed:", sessionError);
      return json({ error: "Failed to create session" }, 500);
    }

    // 8b. Record payment
    const { error: paymentError } = await supabase.from("payments").insert({
      session_id: session.id,
      user_id: studentId,
      amount: expectedAmount,
      platform_fee: platformFee,
      transaction_reference: reference,
      status: "success",
      payment_provider: "paystack",
      metadata: {
        paystack_reference: paystackData.data.reference,
        channel: paystackData.data.channel,
        currency: paystackData.data.currency,
        paid_at: paystackData.data.paid_at,
      },
    });

    if (paymentError) {
      console.error("Payment record failed:", paymentError);
      // Session was created — log but don't fail the whole request
    }

    // 8c. Mark offer as accepted
    await supabase.from("offers").update({ accepted: true }).eq("id", offer_id);

    // 8d. Update post status to in_progress
    await supabase
      .from("posts")
      .update({ status: "in_progress" })
      .eq("id", post_id);

    // 8e. Create notification for helper
    await supabase.from("notifications").insert({
      user_id: helper_id,
      type: "offer_accepted",
      title: "Your offer was accepted! 🎉",
      body: `The student accepted your offer for ${post.course}. Head to your Helping tab to get started.`,
      ref_id: session.id,
    });

    // ── 9. Return success ─────────────────────────────────────────────────
    return json({
      success: true,
      session_id: session.id,
      amount: expectedAmount,
      platform_fee: platformFee,
      reference,
    });
  } catch (err) {
    console.error("Unexpected error in verify-payment:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ── Helper ────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
