// supabase/functions/paystack-webhook/index.ts
// Handles Paystack webhook events for async payment confirmation
// Deploy: supabase functions deploy paystack-webhook
// Set in Paystack dashboard: https://yourproject.supabase.co/functions/v1/paystack-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response("Webhook not configured", { status: 500 });
    }

    // ── 1. Verify Paystack signature ──────────────────────────────────────
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const rawBody = await req.text();
    const expectedSig = createHmac("sha512", paystackSecretKey)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSig) {
      console.error("Invalid Paystack webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // ── 2. Parse event ────────────────────────────────────────────────────
    const event = JSON.parse(rawBody);
    console.log("Paystack webhook event:", event.event);

    // Only handle charge.success
    if (event.event !== "charge.success") {
      return new Response("Event ignored", { status: 200 });
    }

    const data = event.data;
    const reference = data.reference;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 3. Check if already processed ────────────────────────────────────
    const { data: existing } = await supabase
      .from("payments")
      .select("id, status")
      .eq("transaction_reference", reference)
      .maybeSingle();

    if (existing?.status === "success") {
      console.log("Webhook: payment already processed:", reference);
      return new Response("Already processed", { status: 200 });
    }

    // ── 4. Update payment record if it exists ─────────────────────────────
    if (existing) {
      await supabase
        .from("payments")
        .update({
          status: "success",
          updated_at: new Date().toISOString(),
          metadata: {
            channel: data.channel,
            currency: data.currency,
            paid_at: data.paid_at,
            webhook_confirmed: true,
          },
        })
        .eq("transaction_reference", reference);

      // Also ensure work_session payment_status is paid
      await supabase
        .from("work_sessions")
        .update({ payment_status: "paid" })
        .eq("payment_reference", reference);
    }

    console.log("Webhook processed successfully:", reference);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
