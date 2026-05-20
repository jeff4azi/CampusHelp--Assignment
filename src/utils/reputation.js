// ── Helper Reputation System ───────────────────────────────────────────────

export const LEVELS = {
  Newbie: {
    name: "Newbie",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
    icon: "🌱",
    minJobs: 0,
  },
  "Verified Helper": {
    name: "Verified Helper",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.2)",
    icon: "✅",
    minJobs: 5,
  },
  "Top Helper": {
    name: "Top Helper",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
    icon: "⭐",
    minJobs: 20,
  },
  "Elite Tutor": {
    name: "Elite Tutor",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.2)",
    icon: "👑",
    minJobs: 50,
  },
};

export const BADGES = {
  top_rated: {
    label: "Top Rated",
    icon: "⭐",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    description: "Consistently rated 4.8+ stars",
  },
  perfect_completion: {
    label: "100% Completion",
    icon: "💯",
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    description: "Never abandoned a job",
  },
  century_club: {
    label: "Century Club",
    icon: "🏆",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    description: "Completed 100+ jobs",
  },
  top_earner: {
    label: "Top Earner",
    icon: "💰",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.1)",
    description: "Earned ₦100,000+",
  },
  fast_responder: {
    label: "Fast Responder",
    icon: "⚡",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.1)",
    description: "Responds within 30 minutes",
  },
  school_verified: {
    label: "School Verified",
    icon: "🎓",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    description: "Verified student",
  },
};

export function getLevelInfo(levelName) {
  return LEVELS[levelName] ?? LEVELS["Newbie"];
}

export function getBadgeInfo(badgeKey) {
  return BADGES[badgeKey] ?? null;
}

export function getTrustScoreColor(score) {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#60a5fa";
  if (score >= 40) return "#fbbf24";
  return "#94a3b8";
}

export function getNextLevel(levelName, completedJobs) {
  const order = ["Newbie", "Verified Helper", "Top Helper", "Elite Tutor"];
  const idx = order.indexOf(levelName);
  if (idx === order.length - 1) return null;
  const next = order[idx + 1];
  const needed = LEVELS[next].minJobs - completedJobs;
  return { level: next, jobsNeeded: Math.max(0, needed) };
}
