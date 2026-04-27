/**
 * Formats a number as a Naira currency string.
 * @param {number} amount
 * @returns {string} e.g. "₦25,000"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns a human-readable relative time string from an ISO timestamp.
 * @param {string} isoString
 * @returns {string} e.g. "just now", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}
