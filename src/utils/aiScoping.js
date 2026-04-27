const ACADEMIC_KEYWORDS = [
  "assignment",
  "homework",
  "essay",
  "exam",
  "study",
  "course",
  "lecture",
  "professor",
  "grade",
  "thesis",
  "research",
  "paper",
  "deadline",
  "tutor",
  "help",
  "explain",
  "understand",
  "concept",
  "math",
  "science",
  "history",
  "literature",
  "code",
  "programming",
  "algorithm",
  "data",
  "analysis",
  "write",
  "review",
  "feedback",
];

const PLATFORM_KEYWORDS = [
  "post",
  "request",
  "budget",
  "marketplace",
  "dashboard",
  "login",
  "signup",
  "account",
  "profile",
  "feed",
  "create",
  "submit",
];

/**
 * Returns true if the message contains any academic or platform keyword.
 * @param {string} message
 * @returns {boolean}
 */
export function isOnTopic(message) {
  const lower = message.toLowerCase();
  return (
    ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw)) ||
    PLATFORM_KEYWORDS.some((kw) => lower.includes(kw))
  );
}
