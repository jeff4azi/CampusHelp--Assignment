import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";
import { analytics } from "../utils/analytics.js";
import toast from "react-hot-toast";

function StarIcon({ filled, onClick, onHover }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className="transition-transform hover:scale-110 cursor-pointer"
    >
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill={filled ? "#fbbf24" : "none"}
        stroke={filled ? "#fbbf24" : "var(--text-3)"}
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function ReviewModal({
  session,
  revieweeId,
  revieweeName,
  onClose,
  onSubmitted,
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const [submitting, setSubmitting] = useState(false);

  const displayRating = hovered || rating;

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        session_id: session.id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("You've already reviewed this session.");
        } else {
          throw error;
        }
        return;
      }
      analytics.reviewSubmitted(user.id, session.id, rating);
      toast.success("Review submitted! Thank you.");
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error("Failed to submit review. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="font-bold text-[15px]"
              style={{ color: "var(--text-1)" }}
            >
              Rate your experience
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              How was working with {revieweeName}?
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Stars */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center gap-1"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  filled={star <= displayRating}
                  onClick={() => setRating(star)}
                  onHover={() => setHovered(star)}
                />
              ))}
            </div>
            <p
              className="text-[13px] font-semibold h-5"
              style={{ color: displayRating ? "#fbbf24" : "var(--text-3)" }}
            >
              {displayRating ? RATING_LABELS[displayRating] : "Tap to rate"}
            </p>
          </div>

          {/* Comment */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your experience…"
              className="w-full rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all outline-none resize-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                background: "var(--bg-hover)",
              }}
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
