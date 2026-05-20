import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import {
  LevelBadge,
  BadgePill,
  TrustScoreBar,
  StarRating,
} from "./ReputationBadge.jsx";
import { getLevelInfo, getNextLevel, BADGES } from "../utils/reputation.js";
import { formatCurrency } from "../utils/formatters.js";

// ── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color = "var(--text-1)" }) {
  return (
    <div
      className="flex flex-col gap-0.5 p-3 rounded-xl text-center"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-lg font-bold" style={{ color }}>
        {value}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--text-2)" }}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Single review row ─────────────────────────────────────────────────────
function ReviewRow({ review }) {
  const filled = Math.round(review.rating);
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg
              key={s}
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill={s <= filled ? "#fbbf24" : "none"}
              stroke={s <= filled ? "#fbbf24" : "var(--text-3)"}
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          ))}
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {new Date(review.created_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      {review.comment && (
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: "var(--text-2)" }}
        >
          "{review.comment}"
        </p>
      )}
    </div>
  );
}

// ── Progress bar toward next level ───────────────────────────────────────
function LevelProgress({ levelName, completedJobs }) {
  const next = getNextLevel(levelName, completedJobs);
  if (!next) {
    return (
      <div
        className="text-[11px] text-center"
        style={{ color: "var(--text-3)" }}
      >
        👑 Maximum level reached
      </div>
    );
  }
  const levelInfo = getLevelInfo(levelName);
  const nextInfo = getLevelInfo(next.level);
  const current = completedJobs - (levelInfo.minJobs ?? 0);
  const needed = (nextInfo.minJobs ?? 0) - (levelInfo.minJobs ?? 0);
  const pct = Math.min((current / needed) * 100, 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: "var(--text-3)" }}>
          Progress to{" "}
          <span style={{ color: nextInfo.color }}>{next.level}</span>
        </span>
        <span style={{ color: "var(--text-3)" }}>
          {next.jobsNeeded} job{next.jobsNeeded !== 1 ? "s" : ""} to go
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: nextInfo.color }}
        />
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────
export default function HelperProfileModal({ helperId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!helperId) return;
    setLoading(true);

    Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, bio, skills, rating, total_reviews, level_name, trust_score, completed_jobs, completion_rate, total_earnings, badges, is_verified, response_time_avg, university, department, created_at",
        )
        .eq("id", helperId)
        .single(),
      supabase
        .from("reviews")
        .select("rating, comment, created_at")
        .eq("reviewee_id", helperId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([{ data: p }, { data: r }]) => {
      setProfile(p ?? null);
      setReviews(r ?? []);
      setLoading(false);
    });
  }, [helperId]);

  const levelInfo = getLevelInfo(profile?.level_name ?? "Newbie");
  const initials = (profile?.full_name ||
    profile?.email ||
    "?")[0].toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden fade-in flex flex-col"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
          maxHeight: "90vh",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header bar ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            Helper Profile
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[80, 120, 60].map((w, i) => (
                <div
                  key={i}
                  className="skeleton rounded-xl"
                  style={{ height: `${w}px` }}
                />
              ))}
            </div>
          ) : !profile ? (
            <div
              className="text-center py-8 text-sm"
              style={{ color: "var(--text-3)" }}
            >
              Profile not found.
            </div>
          ) : (
            <>
              {/* ── Identity ──────────────────────────────────────── */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${levelInfo.color}cc, ${levelInfo.color}66)`,
                    border: `2px solid ${levelInfo.border}`,
                  }}
                >
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2
                      className="text-[15px] font-bold truncate"
                      style={{ color: "var(--text-1)" }}
                    >
                      {profile.full_name || "Helper"}
                    </h2>
                    {profile.is_verified && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: "rgba(96,165,250,0.1)",
                          color: "#60a5fa",
                          border: "1px solid rgba(96,165,250,0.2)",
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <LevelBadge
                      level={profile.level_name ?? "Newbie"}
                      size="sm"
                    />
                    {memberSince && (
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--text-3)" }}
                      >
                        Since {memberSince}
                      </span>
                    )}
                  </div>

                  {(profile.university || profile.department) && (
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "var(--text-3)" }}
                    >
                      🎓{" "}
                      {[profile.department, profile.university]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Rating + Trust Score ──────────────────────────── */}
              <div
                className="p-4 rounded-xl flex flex-col gap-3"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <StarRating
                    rating={profile.rating ?? 0}
                    count={profile.total_reviews ?? 0}
                    size="lg"
                  />
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-3)" }}
                  >
                    Trust Score
                  </span>
                </div>
                <TrustScoreBar score={profile.trust_score ?? 0} showLabel />
              </div>

              {/* ── Stats grid ───────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                <StatTile
                  label="Jobs Done"
                  value={profile.completed_jobs ?? 0}
                  color="#34d399"
                />
                <StatTile
                  label="Completion"
                  value={`${Math.round(profile.completion_rate ?? 0)}%`}
                  color={
                    (profile.completion_rate ?? 0) >= 90
                      ? "#34d399"
                      : (profile.completion_rate ?? 0) >= 70
                        ? "#fbbf24"
                        : "#f87171"
                  }
                />
                <StatTile
                  label="Avg Response"
                  value={
                    (profile.response_time_avg ?? 0) === 0
                      ? "—"
                      : (profile.response_time_avg ?? 0) < 60
                        ? `${profile.response_time_avg}m`
                        : `${Math.round((profile.response_time_avg ?? 0) / 60)}h`
                  }
                  color="#60a5fa"
                />
              </div>

              {/* ── Level progress ───────────────────────────────── */}
              <LevelProgress
                levelName={profile.level_name ?? "Newbie"}
                completedJobs={profile.completed_jobs ?? 0}
              />

              {/* ── Badges ───────────────────────────────────────── */}
              {profile.badges?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-3)" }}
                  >
                    Badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.badges.map((b) => {
                      const info = BADGES[b];
                      if (!info) return null;
                      return (
                        <div
                          key={b}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                          style={{
                            background: info.bg,
                            color: info.color,
                            border: `1px solid ${info.color}33`,
                          }}
                          title={info.description}
                        >
                          <span>{info.icon}</span>
                          {info.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Bio ──────────────────────────────────────────── */}
              {profile.bio && (
                <div className="flex flex-col gap-1.5">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-3)" }}
                  >
                    About
                  </p>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--text-2)" }}
                  >
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* ── Skills ───────────────────────────────────────── */}
              {profile.skills?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-3)" }}
                  >
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                        style={{
                          background: "rgba(99,102,241,0.1)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.2)",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Recent reviews ───────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  Recent Reviews{" "}
                  {reviews.length > 0 &&
                    `(${profile.total_reviews ?? reviews.length})`}
                </p>
                {reviews.length === 0 ? (
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                    No reviews yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {reviews.map((r, i) => (
                      <ReviewRow key={i} review={r} />
                    ))}
                    {(profile.total_reviews ?? 0) > 5 && (
                      <p
                        className="text-[11px] text-center"
                        style={{ color: "var(--text-3)" }}
                      >
                        +{(profile.total_reviews ?? 0) - 5} more reviews
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
