import {
  getLevelInfo,
  getBadgeInfo,
  getTrustScoreColor,
} from "../utils/reputation.js";

// ── Level pill ─────────────────────────────────────────────────────────────
export function LevelBadge({ level, size = "sm" }) {
  const info = getLevelInfo(level);
  const isLg = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full ${isLg ? "px-3 py-1 text-[12px]" : "px-2 py-0.5 text-[10px]"}`}
      style={{
        background: info.bg,
        color: info.color,
        border: `1px solid ${info.border}`,
      }}
    >
      <span>{info.icon}</span>
      {info.name}
    </span>
  );
}

// ── Single badge pill ──────────────────────────────────────────────────────
export function BadgePill({ badgeKey, size = "sm" }) {
  const info = getBadgeInfo(badgeKey);
  if (!info) return null;
  const isLg = size === "lg";
  return (
    <span
      title={info.description}
      className={`inline-flex items-center gap-1 font-semibold rounded-full cursor-default ${isLg ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"}`}
      style={{
        background: info.bg,
        color: info.color,
        border: `1px solid ${info.color}22`,
      }}
    >
      <span>{info.icon}</span>
      {isLg && info.label}
    </span>
  );
}

// ── Badge row ──────────────────────────────────────────────────────────────
export function BadgeRow({ badges = [], max = 4, size = "sm" }) {
  if (!badges?.length) return null;
  const visible = badges.slice(0, max);
  const rest = badges.length - max;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((b) => (
        <BadgePill key={b} badgeKey={b} size={size} />
      ))}
      {rest > 0 && (
        <span
          className="text-[10px] font-medium"
          style={{ color: "var(--text-3)" }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

// ── Trust score bar ────────────────────────────────────────────────────────
export function TrustScoreBar({ score = 0, showLabel = true }) {
  const color = getTrustScoreColor(score);
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-bold shrink-0" style={{ color }}>
          {Math.round(pct)}
        </span>
      )}
    </div>
  );
}

// ── Star rating display ────────────────────────────────────────────────────
export function StarRating({ rating = 0, count, size = "sm" }) {
  const sz = size === "lg" ? "w-4 h-4" : "w-3 h-3";
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            className={sz}
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
      {rating > 0 && (
        <span
          className={`font-semibold ${size === "lg" ? "text-[13px]" : "text-[11px]"}`}
          style={{ color: "#fbbf24" }}
        >
          {Number(rating).toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
          ({count})
        </span>
      )}
    </div>
  );
}

// ── Compact helper card (used in offers list, marketplace) ─────────────────
export function HelperCard({ profile, onClick }) {
  if (!profile) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 cursor-pointer group"
    >
      <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
        {(profile.full_name || profile.email || "?")[0].toUpperCase()}
      </div>
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[13px] font-semibold group-hover:text-indigo-400 transition-colors truncate"
            style={{ color: "var(--text-1)" }}
          >
            {profile.full_name || "Helper"}
          </span>
          <LevelBadge level={profile.level_name || "Newbie"} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StarRating
            rating={profile.rating || 0}
            count={profile.total_reviews}
          />
          {profile.badges?.length > 0 && (
            <BadgeRow badges={profile.badges} max={2} />
          )}
        </div>
      </div>
    </button>
  );
}
