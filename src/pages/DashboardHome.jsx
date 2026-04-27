import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { useSessions } from "../hooks/useSessions.js";
import { useNotifications } from "../hooks/useNotifications.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import CreatePostModal from "../components/CreatePostModal.jsx";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import {
  BriefcaseIcon,
  HandshakeIcon,
  CheckCircleIcon,
  BellIcon,
  ArrowRightIcon,
  PlusIcon,
  StoreIcon,
} from "../components/Icons.jsx";

// ── Stat card (only shown when user has data) ─────────────────────────────
function StatCard({ label, value, sub, Icon, color }) {
  return (
    <div className="card rounded-2xl p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Empty / first-time screen ─────────────────────────────────────────────
function FirstTimeScreen({ onCreatePost }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center mb-6">
        <BriefcaseIcon className="w-9 h-9 text-indigo-400" />
      </div>

      <h1
        className="text-2xl sm:text-3xl font-bold mb-3"
        style={{ color: "var(--text-1)" }}
      >
        What do you need help with?
      </h1>
      <p
        className="text-sm max-w-sm mb-8 leading-relaxed"
        style={{ color: "var(--text-2)" }}
      >
        Post your assignment, set a budget, and get matched with a helper —
        usually within minutes.
      </p>

      {/* Primary CTA */}
      <button
        onClick={onCreatePost}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-900/30 hover:-translate-y-0.5 cursor-pointer text-base"
      >
        <PlusIcon className="w-5 h-5" />
        Create your first request
      </button>

      {/* Secondary — browse */}
      <button
        onClick={() => window.location.assign("/marketplace")}
        className="mt-4 text-sm transition-colors cursor-pointer"
        style={{ color: "var(--text-3)" }}
      >
        Or browse open jobs →
      </button>

      {/* Steps hint */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { step: "1", label: "Post your request" },
          { step: "2", label: "Get matched fast" },
          { step: "3", label: "Work gets done" },
        ].map(({ step, label }) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
              {step}
            </div>
            <p
              className="text-xs text-center"
              style={{ color: "var(--text-3)" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard (returning user with data) ─────────────────────────────
export default function DashboardHome() {
  const { user } = useAuth();
  const { posts, postsLoading } = usePosts();
  const { sessions } = useSessions();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const myPosts = posts.filter((p) => p.userId === user?.id);
  const openPosts = myPosts.filter((p) => p.status === "open");
  const activeSessions = sessions.filter((s) => s.status === "active");
  const helpingSessions = sessions.filter(
    (s) => s.helperId === user?.id && s.status === "active",
  );
  const completedSessions = sessions.filter(
    (s) =>
      s.status === "completed" &&
      (s.ownerId === user?.id || s.helperId === user?.id),
  );

  const recentMyPosts = [...myPosts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const recentNotifs = notifications.slice(0, 3);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const hasAnyData =
    myPosts.length > 0 ||
    completedSessions.length > 0 ||
    activeSessions.length > 0;

  // Show loading shimmer
  if (postsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-3)" }}
          >
            Loading…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ── First-time empty state ── */}
      {!hasAnyData ? (
        <>
          <FirstTimeScreen onCreatePost={() => setShowModal(true)} />
          {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
        </>
      ) : (
        /* ── Returning user dashboard ── */
        <div className="px-4 sm:px-6 pt-6 pb-16">
          {/* Greeting + quick action */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--text-1)" }}
              >
                {greeting}, {user?.username?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
                Here's what's happening.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">New Request</span>
              <span className="sm:hidden">Post</span>
            </button>
          </div>

          {/* Stats row — only shown when there's real data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="My Requests"
              value={myPosts.length}
              sub={`${openPosts.length} open`}
              Icon={BriefcaseIcon}
              color="bg-indigo-500/15 text-indigo-400"
            />
            <StatCard
              label="Active Sessions"
              value={activeSessions.length}
              sub={`${helpingSessions.length} helping`}
              Icon={HandshakeIcon}
              color="bg-amber-500/15 text-amber-400"
            />
            <StatCard
              label="Completed"
              value={completedSessions.length}
              Icon={CheckCircleIcon}
              color="bg-emerald-500/15 text-emerald-400"
            />
            <StatCard
              label="Notifications"
              value={unreadCount}
              sub="unread"
              Icon={BellIcon}
              color="bg-violet-500/15 text-violet-400"
            />
          </div>

          {/* Two column: My Requests + Open Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* My Requests */}
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-1)" }}
                >
                  Your Requests
                </h2>
                <button
                  onClick={() => navigate("/my-jobs")}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  View all <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>

              {recentMyPosts.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <BriefcaseIcon
                    className="w-8 h-8"
                    style={{ color: "var(--text-3)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>
                    No requests yet.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    + Create one now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentMyPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => navigate("/my-jobs")}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl cursor-pointer transition-opacity hover:opacity-75"
                      style={{ background: "var(--border)" }}
                    >
                      <div className="min-w-0">
                        <span className="text-xs text-indigo-400 font-medium">
                          {post.course}
                        </span>
                        <p
                          className="text-sm truncate mt-0.5"
                          style={{ color: "var(--text-1)" }}
                        >
                          {post.description}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatRelativeTime(post.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm text-emerald-400 font-semibold">
                          {formatCurrency(post.budget)}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                            post.status === "open"
                              ? "bg-indigo-500/15 text-indigo-400"
                              : post.status === "in_progress"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          {post.status === "in_progress"
                            ? "In Progress"
                            : post.status.charAt(0).toUpperCase() +
                              post.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Jobs in marketplace */}
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-1)" }}
                >
                  Open Jobs
                </h2>
                <button
                  onClick={() => navigate("/marketplace")}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Browse all <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>

              {(() => {
                const openJobs = posts
                  .filter((p) => p.status === "open" && p.userId !== user?.id)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 3);

                return openJobs.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <StoreIcon
                      className="w-8 h-8"
                      style={{ color: "var(--text-3)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>
                      No open jobs right now.
                    </p>
                    <button
                      onClick={() => navigate("/marketplace")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Check marketplace
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {openJobs.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => navigate("/marketplace")}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl cursor-pointer transition-opacity hover:opacity-75"
                        style={{ background: "var(--border)" }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs text-indigo-400 font-medium">
                            {post.course}
                          </span>
                          <p
                            className="text-sm truncate mt-0.5"
                            style={{ color: "var(--text-1)" }}
                          >
                            {post.description}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--text-3)" }}
                          >
                            {formatRelativeTime(post.createdAt)}
                          </p>
                        </div>
                        <span className="text-sm text-emerald-400 font-semibold shrink-0">
                          {formatCurrency(post.budget)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Recent notifications — only if any */}
          {recentNotifs.length > 0 && (
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-1)" }}
                >
                  Recent Alerts
                </h2>
                <button
                  onClick={() => navigate("/notifications")}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  View all <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-xl ${n.read ? "" : "border border-indigo-500/15"}`}
                    style={{
                      background: n.read
                        ? "var(--border)"
                        : "rgba(99,102,241,0.05)",
                    }}
                  >
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-1)" }}
                      >
                        {n.title}
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--text-2)" }}
                      >
                        {n.body}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-3)" }}
                      >
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}
