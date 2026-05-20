import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";
import { rankHelpers } from "../utils/aiMatching.js";
import { LevelBadge, StarRating } from "./ReputationBadge.jsx";
import HelperProfileModal from "./HelperProfileModal.jsx";
import { formatCurrency } from "../utils/formatters.js";
import toast from "react-hot-toast";

// ── Match score ring ──────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color =
    score >= 85
      ? "#34d399"
      : score >= 70
        ? "#818cf8"
        : score >= 50
          ? "#fbbf24"
          : "#94a3b8";

  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Grade pill ────────────────────────────────────────────────────────────
function GradePill({ grade }) {
  const map = {
    "Excellent Match": { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
    "Strong Match": { bg: "rgba(99,102,241,0.1)", color: "#818cf8" },
    "Good Match": { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    "Possible Match": { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    "New Helper": { bg: "rgba(148,163,184,0.08)", color: "#94a3b8" },
  };
  const s = map[grade] ?? map["New Helper"];
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {grade}
    </span>
  );
}

// ── Single helper match card ──────────────────────────────────────────────
function HelperMatchCard({ helper, post, ownerName }) {
  const [showProfile, setShowProfile] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);

  async function handleInvite() {
    if (invited || inviting) return;
    setInviting(true);

    try {
      // Insert a notification directly into the helper's notifications
      const { error } = await supabase.from("notifications").insert({
        user_id: helper.id, // ← goes to the HELPER's account
        type: "helper_invited",
        title: "You've been invited to help! 🎯",
        body: `${ownerName || "A student"} thinks you're a great match for their ${post.course} assignment — "${(post.description || "").slice(0, 80)}${(post.description || "").length > 80 ? "…" : ""}". Budget: ${formatCurrency(post.budget)}. Check the marketplace to apply.`,
        ref_id: post.id,
      });

      if (error) throw error;

      setInvited(true);
      toast.success(`Invite sent to ${helper.full_name || "helper"}!`);
    } catch (err) {
      console.error("Invite failed:", err);
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <div
        className="flex items-start gap-3 p-3 rounded-xl transition-all"
        style={{
          background: "var(--bg-input)",
          border: `1px solid ${invited ? "rgba(52,211,153,0.25)" : "var(--border)"}`,
        }}
      >
        {/* Score ring */}
        <ScoreRing score={helper._score} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span
              className="text-[12px] font-bold truncate"
              style={{ color: "var(--text-1)" }}
            >
              {helper.full_name || "Helper"}
            </span>
            <LevelBadge level={helper.level_name ?? "Newbie"} />
            <GradePill grade={helper._grade} />
          </div>

          <StarRating
            rating={helper.rating ?? 0}
            count={helper.total_reviews}
          />

          {/* Match reasons */}
          {helper._reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {helper._reasons.map((r, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{
                    background: "var(--bg-hover)",
                    color: "var(--text-3)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={handleInvite}
            disabled={inviting || invited}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 text-white disabled:cursor-not-allowed"
            style={
              invited
                ? {
                    background: "rgba(52,211,153,0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(52,211,153,0.3)",
                  }
                : {
                    background: "var(--accent)",
                    boxShadow: "var(--shadow-btn)",
                  }
            }
          >
            {inviting ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </span>
            ) : invited ? (
              "✓ Invited"
            ) : (
              "Invite"
            )}
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-3)",
              border: "1px solid var(--border)",
            }}
          >
            Profile
          </button>
        </div>
      </div>

      {showProfile && (
        <HelperProfileModal
          helperId={helper.id}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function MatchedHelpers({ post }) {
  const { user } = useAuth();
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [ownerName, setOwnerName] = useState("");

  // Fix: declare loadHelpers with useCallback BEFORE the useEffect that calls it
  const loadHelpers = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, rating, total_reviews, level_name, completed_jobs, completion_rate, trust_score, skills, badges, response_time_avg, is_verified, bio",
      )
      .neq("id", post.userId)
      .eq("is_suspended", false)
      .order("trust_score", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const ranked = rankHelpers(data, post, 3);
      setHelpers(ranked);
    }

    setLoading(false);
  }, [post]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!post?.id) return;
    loadHelpers();
  }, [post?.id, loadHelpers]);

  // Fetch owner's display name for the invite message
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setOwnerName(data.full_name);
        else setOwnerName(user.username || "A student");
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div
        className="mt-4 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🤖</span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-3)" }}
          >
            AI Matched Helpers
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton rounded-xl h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (helpers.length === 0) return null;

  const visible = expanded ? helpers : helpers.slice(0, 2);

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🤖</span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-3)" }}
          >
            AI Matched Helpers
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
          >
            {helpers.length}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
          Ranked by fit
        </span>
      </div>

      {/* Helper cards */}
      <div className="flex flex-col gap-2">
        {visible.map((helper) => (
          <HelperMatchCard
            key={helper.id}
            helper={helper}
            post={post}
            ownerName={ownerName}
          />
        ))}
      </div>

      {/* Show more */}
      {helpers.length > 2 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full mt-2 py-1.5 text-[11px] font-semibold cursor-pointer transition-colors rounded-lg"
          style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
        >
          {expanded ? "Show less ↑" : `Show ${helpers.length - 2} more ↓`}
        </button>
      )}
    </div>
  );
}
