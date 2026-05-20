import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { supabase } from "../lib/supabase.js";
import { formatCurrency } from "../utils/formatters.js";
import { generateOfferMessage } from "../utils/aiMatching.js";
import toast from "react-hot-toast";

function SparklesIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

export default function ApplyModal({
  post,
  onClose,
  onApplied,
  preselectedHelper,
}) {
  const { user } = useAuth();
  const { submitOffer } = usePosts();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [myProfile, setMyProfile] = useState(null);

  // Load the current user's profile for AI context
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name, skills, completed_jobs, rating, bio, level_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setMyProfile(data);
      });
  }, [user?.id]);

  async function handleGenerateMessage() {
    setGenerating(true);
    setGenerated(false);
    try {
      const profile = myProfile || { full_name: user?.username };
      const msg = await generateOfferMessage(post, profile);
      setMessage(msg);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch {
      toast.error("Could not generate message. Write your own!");
    } finally {
      setGenerating(false);
    }
  }

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
      onApplied?.();
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
        className="w-full max-w-md rounded-2xl shadow-2xl p-6 fade-in"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
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
            {/* Label + AI button */}
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-3)" }}
              >
                Your offer message
              </label>
              <button
                type="button"
                onClick={handleGenerateMessage}
                disabled={generating}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: generated
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(99,102,241,0.1)",
                  border: `1px solid ${generated ? "rgba(52,211,153,0.25)" : "rgba(99,102,241,0.25)"}`,
                  color: generated ? "#34d399" : "#818cf8",
                }}
              >
                {generating ? (
                  <>
                    <svg
                      className="w-3 h-3 animate-spin"
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
                    Writing…
                  </>
                ) : generated ? (
                  <>✓ Generated</>
                ) : (
                  <>
                    <SparklesIcon /> Write with AI
                  </>
                )}
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setGenerated(false);
              }}
              rows={5}
              placeholder="Briefly explain why you can help, your experience, and when you're available…"
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors resize-none"
              style={{
                background: "var(--bg-input)",
                border: `1px solid ${generated ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
                color: "var(--text-1)",
                transition: "border-color 0.3s",
              }}
            />

            {/* Char count */}
            <div className="flex items-center justify-between">
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {message.trim().length === 0
                  ? "Tip: Use AI to write a tailored message instantly"
                  : `${message.trim().length} characters`}
              </p>
              {generated && (
                <p className="text-[11px]" style={{ color: "#34d399" }}>
                  ✓ AI-generated — feel free to edit
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                background: "var(--bg-hover)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              {submitting ? "Submitting…" : "Submit Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
