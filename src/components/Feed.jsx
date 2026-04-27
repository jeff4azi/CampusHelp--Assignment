import { usePosts } from "../hooks/usePosts.js";
import { useAuth } from "../hooks/useAuth.js";
import PostCard from "./PostCard.jsx";
import { StoreIcon } from "./Icons.jsx";

export default function Feed() {
  const { posts, postsLoading } = usePosts();
  const { user } = useAuth();

  // Open posts first, then by newest
  const sorted = [...posts].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const openCount = posts.filter((p) => p.status === "open").length;

  if (postsLoading) {
    return (
      <div className="flex flex-col gap-4 py-6 px-4 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 animate-pulse"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              height: 160,
            }}
          />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--border)" }}
        >
          <StoreIcon className="w-6 h-6" style={{ color: "var(--text-3)" }} />
        </div>
        <p
          className="text-sm font-medium mb-1"
          style={{ color: "var(--text-2)" }}
        >
          No requests yet
        </p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          Be the first to post an assignment request.
        </p>
      </div>
    );
  }

  return (
    <div className="py-5 px-4 sm:px-6">
      {/* Live count bar */}
      {openCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            {openCount} open {openCount === 1 ? "request" : "requests"} —
            helpers are active now
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sorted.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
