import { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { formatCurrency } from "../utils/formatters.js";
import toast from "react-hot-toast";

export default function ApplyModal({ post, onClose }) {
  const { user } = useAuth();
  const { submitOffer } = usePosts();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please write a short message.");
      return;
    }
    setSubmitting(true);
    try {
      await submitOffer(post.id, user.id, message.trim());
      toast.success("Offer submitted! We'll notify you if accepted.");
      onClose();
    } catch (err) {
      setError(
        err?.message?.includes("unique")
          ? "You already applied to this post."
          : "Failed to submit. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              className="font-semibold text-base"
              style={{ color: "var(--text-1)" }}
            >
              Apply to Help
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              <span className="text-indigo-400 font-medium">{post.course}</span>
              {" · "}
              {formatCurrency(post.budget)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none transition-colors cursor-pointer ml-4"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-3)" }}
            >
              Your offer message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Briefly explain why you can help, your experience, and when you're available…"
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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
              className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
