import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { CheckCircleIcon } from "./Icons.jsx";
import { improveDescription } from "../utils/openai.js";

const inputCls = `w-full rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all outline-none`;

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

export default function CreatePostModal({ onClose }) {
  const { user } = useAuth();
  const { addPost } = usePosts();
  const navigate = useNavigate();
  const [form, setForm] = useState({ course: "", description: "", budget: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(null);
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);

  async function handleImprove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!form.description.trim()) return;
    setImproving(true);
    setImproved(false);
    try {
      const better = await improveDescription(form.description, form.course);
      setForm((prev) => ({ ...prev, description: better }));
      setImproved(true);
      setTimeout(() => setImproved(false), 3000);
    } finally {
      setImproving(false);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.course.trim() || !form.description.trim() || !form.budget) {
      setError("All fields are required.");
      return;
    }
    if (Number(form.budget) <= 0) {
      setError("Budget must be greater than 0.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await addPost(form, user.id);
      setPosted(form);
    } catch {
      setError("Failed to post request. Please try again.");
      setSubmitting(false);
    }
  }

  const backdrop =
    "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0";

  // ── Success ───────────────────────────────────────────────────────────
  if (posted) {
    return (
      <div
        className={backdrop}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 flex flex-col items-center text-center fade-in"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: "var(--text-1)" }}
          >
            Request posted!
          </h2>
          <p className="text-[13px] mb-5" style={{ color: "var(--text-2)" }}>
            <span className="text-indigo-400 font-semibold">
              {posted.course}
            </span>{" "}
            · ₦{posted.budget}
          </p>
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-6 w-full justify-center"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <p className="text-[12px] font-medium" style={{ color: "#a5b4fc" }}>
              Matching you with a helper now…
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={() => {
                navigate("/my-jobs");
                onClose();
              }}
              className="w-full py-3 text-white font-semibold rounded-xl text-[13.5px] transition-all cursor-pointer active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              View my requests
            </button>
            <button
              onClick={() => {
                navigate("/marketplace");
                onClose();
              }}
              className="w-full py-2.5 text-[13px] rounded-xl transition-colors cursor-pointer font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                background: "var(--bg-hover)",
              }}
            >
              Browse open jobs
            </button>
            <button
              onClick={onClose}
              className="text-[12px] transition-colors cursor-pointer mt-1"
              style={{ color: "var(--text-3)" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <div
      className={backdrop}
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="font-bold text-[15px]"
              style={{ color: "var(--text-1)" }}
            >
              New Assignment Request
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              Fill in the details below
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-lg leading-none"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-[13px]"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Course */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Course Name
            </label>
            <input
              name="course"
              value={form.course}
              onChange={handleChange}
              placeholder="e.g. CS 301, MATH 201"
              className={inputCls}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-3)" }}
              >
                What do you need help with?
              </label>
              <button
                type="button"
                onClick={handleImprove}
                disabled={improving || !form.description.trim()}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: improved
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(99,102,241,0.1)",
                  border: `1px solid ${improved ? "rgba(52,211,153,0.25)" : "rgba(99,102,241,0.25)"}`,
                  color: improved ? "#34d399" : "#818cf8",
                }}
              >
                {improving ? (
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
                    Improving…
                  </>
                ) : improved ? (
                  <>✓ Improved</>
                ) : (
                  <>
                    <SparklesIcon /> Improve with AI
                  </>
                )}
              </button>
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe the assignment, your deadline, and any details that would help a tutor…"
              className={inputCls + " resize-none"}
              style={{
                background: "var(--bg-input)",
                border: `1px solid ${improved ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
                color: "var(--text-1)",
                transition: "border-color 0.3s",
              }}
            />
            {!form.description.trim() && (
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Write something first, then AI can improve it.
              </p>
            )}
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Budget (NGN ₦)
            </label>
            <input
              name="budget"
              type="number"
              min="1"
              step="1"
              value={form.budget}
              onChange={handleChange}
              placeholder="e.g. 5000"
              className={inputCls}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
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
              disabled={submitting}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              {submitting ? "Posting…" : "Post Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
