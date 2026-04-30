import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth.js";
import { formatCurrency } from "../utils/formatters.js";
import { analytics } from "../utils/analytics.js";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const PLATFORM_FEE_PERCENT = 0.15;

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;

// Load Paystack inline script dynamically
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export default function PaymentModal({ offer, post, onSuccess, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const amount = Number(post.budget);
  const platformFee = amount * PLATFORM_FEE_PERCENT;
  const helperEarns = amount - platformFee;

  useEffect(() => {
    loadPaystackScript().then(setScriptLoaded);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Called after Paystack popup closes with success ──────────────────────
  // This is the ONLY place session creation happens — via server-side verification
  async function verifyAndCreateSession(reference) {
    setVerifying(true);

    try {
      // Get the current user's JWT to authenticate the edge function call
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference,
          post_id: post.id,
          offer_id: offer.id,
          helper_id: offer.helperId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error || "Payment verification failed";
        console.error("Verification failed:", data);
        analytics.paymentFailed(user.id, null, msg);
        toast.error(`${msg}. Please contact support if money was deducted.`);
        setVerifying(false);
        setLoading(false);
        return;
      }

      // ✅ Server confirmed payment — session already created server-side
      analytics.paymentCompleted(user.id, data.session_id, amount, reference);
      toast.success("Payment verified! Starting your session…");
      setVerifying(false);
      setLoading(false);

      // Pass session_id up so OffersList can navigate to it
      onSuccess({ session_id: data.session_id, reference, amount });
    } catch (err) {
      console.error("Verification error:", err);
      toast.error(
        "Verification failed. Please contact support if money was deducted.",
      );
      analytics.paymentFailed(user.id, null, String(err));
      setVerifying(false);
      setLoading(false);
    }
  }

  function handlePay() {
    if (!scriptLoaded || !window.PaystackPop) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error(
        "Paystack key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to .env",
      );
      return;
    }

    setLoading(true);
    analytics.paymentInitiated(user.id, null, amount);

    const reference = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: amount * 100, // kobo
      currency: "NGN",
      ref: reference,
      metadata: {
        custom_fields: [
          {
            display_name: "Course",
            variable_name: "course",
            value: post.course,
          },
          {
            display_name: "Helper",
            variable_name: "helper_id",
            value: offer.helperId,
          },
          { display_name: "Post ID", variable_name: "post_id", value: post.id },
          {
            display_name: "Offer ID",
            variable_name: "offer_id",
            value: offer.id,
          },
        ],
      },
      // ⚠️ Must be a plain function — NOT async. Paystack validates this synchronously.
      // We call the async verification inside using a separate function.
      callback: function (response) {
        // Paystack popup closed with success — now verify server-side
        verifyAndCreateSession(response.reference);
      },
      onClose: function () {
        if (!verifying) {
          analytics.paymentFailed(user.id, null, "user_closed");
          setLoading(false);
          toast("Payment cancelled.", { icon: "ℹ️" });
        }
      },
    });

    handler.openIframe();
  }

  const isProcessing = loading || verifying;
  const statusText = verifying ? "Verifying payment…" : "Processing…";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !isProcessing && onClose()
      }
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 fade-in"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="font-bold text-[15px]"
              style={{ color: "var(--text-1)" }}
            >
              Complete Payment
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {verifying
                ? "Verifying your payment securely…"
                : "Pay to start the work session"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        {/* Verification progress banner */}
        {verifying && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <svg
              className="w-4 h-4 animate-spin shrink-0 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <div>
              <p
                className="text-[12px] font-semibold"
                style={{ color: "#a5b4fc" }}
              >
                Verifying payment with server…
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "var(--text-3)" }}
              >
                Please don't close this window
              </p>
            </div>
          </div>
        )}

        {/* Job summary */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Assignment
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-lg font-semibold"
              style={{
                background: "rgba(99,102,241,0.1)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              {post.course}
            </span>
          </div>
          <p
            className="text-[13px] line-clamp-2 mb-3"
            style={{ color: "var(--text-2)" }}
          >
            {post.description}
          </p>

          {/* Fee breakdown */}
          <div
            className="flex flex-col gap-1.5 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex justify-between text-[12px]">
              <span style={{ color: "var(--text-3)" }}>Job budget</span>
              <span style={{ color: "var(--text-1)" }}>
                {formatCurrency(amount)}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: "var(--text-3)" }}>Platform fee (15%)</span>
              <span style={{ color: "#f87171" }}>
                -{formatCurrency(platformFee)}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: "var(--text-3)" }}>Helper earns</span>
              <span style={{ color: "#34d399" }}>
                {formatCurrency(helperEarns)}
              </span>
            </div>
            <div
              className="flex justify-between text-[13px] font-bold pt-1.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--text-1)" }}>You pay</span>
              <span style={{ color: "var(--text-1)" }}>
                {formatCurrency(amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-5 text-[12px]"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.12)",
            color: "#a5b4fc",
          }}
        >
          <span className="shrink-0 mt-0.5">🔒</span>
          <span>
            Payment is verified server-side before your session starts. Fake
            payments are rejected automatically.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-40"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              background: "var(--bg-hover)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={isProcessing || !scriptLoaded}
            className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: "#0ba360",
              boxShadow: "0 4px 16px rgba(11,163,96,0.3)",
            }}
          >
            {isProcessing ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {statusText}
              </>
            ) : (
              <>Pay {formatCurrency(amount)}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
