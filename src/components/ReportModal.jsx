import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";
import { analytics } from "../utils/analytics.js";
import toast from "react-hot-toast";

const USER_REASONS = [
  "Spam or fake account",
  "Inappropriate behavior",
  "Harassment or abuse",
  "Scam or fraud",
  "Other",
];

const POST_REASONS = [
  "Spam or duplicate",
  "Inappropriate content",
  "Misleading information",
  "Fraudulent request",
  "Other",
];

export default function ReportModal({ type, targetId, targetName, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = type === "user" ? USER_REASONS : POST_REASONS;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) {
      toast.error("Please select a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        reporter_id: user.id,
        type,
        reason,
        description: description.trim() || null,
      };
      if (type === "user") payload.reported_user_id = targetId;
      else payload.reported_post_id = targetId;

      const { error } = await supabase.from("reports").insert(payload);
      if (error) throw error;

      analytics.reportSubmitted(user.id, type, targetId);
      toast.success("Report submitted. Our team will review it.");
      onClose();
    } catch (err) {
      toast.error("Failed to submit report. Please try again.");
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
              Report {type === "user" ? "User" : "Post"}
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {targetName
                ? `Reporting: ${targetName}`
                : "Help us keep CampusHelp safe"}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Reason
            </label>
            {reasons.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor:
                      reason === r ? "var(--accent)" : "var(--border)",
                    background: reason === r ? "var(--accent)" : "transparent",
                  }}
                  onClick={() => setReason(r)}
                >
                  {reason === r && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className="text-[13px] cursor-pointer"
                  style={{
                    color: reason === r ? "var(--text-1)" : "var(--text-2)",
                  }}
                  onClick={() => setReason(r)}
                >
                  {r}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-3)" }}
            >
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what happened…"
              className="w-full rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all outline-none resize-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>

          <div className="flex gap-3 mt-1">
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-[13px] cursor-pointer disabled:opacity-50 active:scale-95"
              style={{
                background: "#ef4444",
                boxShadow: "0 4px 16px rgba(239,68,68,0.25)",
              }}
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
