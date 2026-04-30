import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePosts } from "../hooks/usePosts.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { formatRelativeTime } from "../utils/formatters.js";
import PaymentModal from "./PaymentModal.jsx";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

export default function OffersList({ post }) {
  const { offersByPost, fetchOffersForPost } = usePosts();
  const { createNotification } = useNotifications();
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOffersForPost(post.id);
  }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const offers = offersByPost[post.id] ?? [];
  const isInProgress = post.status === "in_progress";

  // Called after edge function confirms payment + creates session
  async function handlePaymentSuccess({ session_id }) {
    setPaymentOffer(null);
    setNavigating(true);

    // Refresh local post state so UI reflects in_progress
    // (edge function already updated DB — just navigate)
    toast.success("Session started! Redirecting…");
    navigate(`/session/${session_id}`);
  }

  if (offers.length === 0) {
    return (
      <p className="text-xs mt-3 italic" style={{ color: "var(--text-3)" }}>
        No offers yet.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-2">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-3)" }}
        >
          Offers ({offers.length})
        </p>
        {offers.map((offer) => (
          <div
            key={offer.id}
            className={`rounded-xl px-3 py-2.5 text-sm flex items-start justify-between gap-3 ${
              offer.accepted
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : ""
            }`}
            style={
              !offer.accepted
                ? {
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                  }
                : {}
            }
          >
            <div className="flex-1 min-w-0">
              <p className="leading-relaxed" style={{ color: "var(--text-1)" }}>
                {offer.message}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                {formatRelativeTime(offer.createdAt)}
              </p>
            </div>
            {offer.accepted ? (
              <span className="shrink-0 text-xs text-emerald-400 font-medium mt-0.5">
                ✓ Accepted
              </span>
            ) : !isInProgress ? (
              <button
                onClick={() => setPaymentOffer(offer)}
                disabled={navigating}
                className="shrink-0 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer mt-0.5"
              >
                Accept
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Payment modal — triggers server-side verification */}
      {paymentOffer && (
        <PaymentModal
          offer={paymentOffer}
          post={post}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentOffer(null)}
        />
      )}
    </>
  );
}
