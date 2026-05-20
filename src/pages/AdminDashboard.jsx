import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import toast from "react-hot-toast";

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: {
      bg: "rgba(99,102,241,0.1)",
      text: "#818cf8",
      border: "rgba(99,102,241,0.2)",
    },
    emerald: {
      bg: "rgba(52,211,153,0.1)",
      text: "#34d399",
      border: "rgba(52,211,153,0.2)",
    },
    amber: {
      bg: "rgba(251,191,36,0.1)",
      text: "#fbbf24",
      border: "rgba(251,191,36,0.2)",
    },
    violet: {
      bg: "rgba(167,139,250,0.1)",
      text: "#a78bfa",
      border: "rgba(167,139,250,0.2)",
    },
    red: {
      bg: "rgba(248,113,113,0.1)",
      text: "#f87171",
      border: "rgba(248,113,113,0.2)",
    },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: c.text }}>
        {value ?? "—"}
      </p>
      {sub && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null); // null = loading
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(data?.is_admin === true);
      });
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: profilesData },
        { data: postsData },
        { data: sessionsData },
        { data: paymentsData },
        { data: reportsData },
        { data: withdrawalsData },
        { data: disputesData },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, email, rating, total_reviews, is_suspended, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("posts")
          .select(
            "id, course, description, budget, status, created_at, user_id",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("work_sessions")
          .select(
            "id, status, payment_status, amount, platform_fee, created_at",
          ),
        supabase.from("payments").select("platform_fee, status"),
        supabase
          .from("reports")
          .select(
            "id, type, reason, status, created_at, reporter_id, reported_user_id, reported_post_id",
          )
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("withdrawals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("disputes")
          .select(
            "id, reason, status, created_at, updated_at, session_id, raised_by, resolution, work_sessions(owner_id, helper_id, posts(course, budget))",
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const totalRevenue = (paymentsData || [])
        .filter((p) => p.status === "success")
        .reduce((sum, p) => sum + (p.platform_fee || 0), 0);

      setStats({
        totalUsers: profilesData?.length ?? 0,
        totalPosts: postsData?.length ?? 0,
        activeSessions: (sessionsData || []).filter(
          (s) => s.status === "active",
        ).length,
        completedSessions: (sessionsData || []).filter(
          (s) => s.status === "completed",
        ).length,
        totalRevenue,
        pendingReports: (reportsData || []).filter(
          (r) => r.status === "pending",
        ).length,
        openDisputes: (disputesData || []).filter(
          (d) => d.status === "open" || d.status === "under_review",
        ).length,
      });

      setUsers(profilesData || []);
      setPosts(postsData || []);
      setReports(reportsData || []);

      // Enrich withdrawals with helper profiles (avoid FK join issue)
      const rawWithdrawals = withdrawalsData || [];
      if (rawWithdrawals.length > 0) {
        const helperIds = [
          ...new Set(rawWithdrawals.map((w) => w.helper_id).filter(Boolean)),
        ];
        let profileMap = {};
        if (helperIds.length > 0) {
          const { data: wProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", helperIds);
          wProfiles?.forEach((p) => {
            profileMap[p.id] = p;
          });
        }
        setWithdrawals(
          rawWithdrawals.map((w) => ({
            ...w,
            profiles: profileMap[w.helper_id] ?? null,
          })),
        );
      } else {
        setWithdrawals([]);
      }

      setDisputes(disputesData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  async function handleSuspendUser(userId, currentStatus) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !currentStatus })
      .eq("id", userId);
    if (error) {
      toast.error("Failed to update user.");
      return;
    }
    toast.success(currentStatus ? "User unsuspended." : "User suspended.");
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_suspended: !currentStatus } : u,
      ),
    );
  }

  async function handleDeletePost(postId) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Failed to delete post.");
      return;
    }
    toast.success("Post deleted.");
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function handleResolveReport(reportId, resolution) {
    const { error } = await supabase
      .from("reports")
      .update({
        status: resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", reportId);
    if (error) {
      toast.error("Failed to update report.");
      return;
    }
    toast.success("Report updated.");
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: resolution } : r)),
    );
  }

  async function handleMarkWithdrawalPaid(withdrawalId, helperId) {
    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })
      .eq("id", withdrawalId);
    if (error) {
      toast.error("Failed to update withdrawal.");
      return;
    }

    // Mark payments as withdrawn — try payment_ids first, fall back to helper_id
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    const realPaymentIds = (withdrawal?.payment_ids || []).filter(
      (id) => id && !id.startsWith("session_"),
    );

    if (realPaymentIds.length > 0) {
      await supabase
        .from("payments")
        .update({
          withdrawal_status: "completed",
          withdrawn_at: new Date().toISOString(),
        })
        .in("id", realPaymentIds);
    } else {
      // Fallback: mark ALL released pending payments for this helper as withdrawn
      await supabase
        .from("payments")
        .update({
          withdrawal_status: "completed",
          withdrawn_at: new Date().toISOString(),
        })
        .eq("helper_id", helperId)
        .eq("withdrawal_status", "pending")
        .eq("escrow_status", "released");
    }

    toast.success("Withdrawal marked as paid. Helper has been notified.");
    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawalId ? { ...w, status: "completed" } : w,
      ),
    );
  }

  // Loading admin check
  if (isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-3)" }}
          >
            Checking access…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Not admin
  if (isAdmin === false) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-2xl">🚫</p>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            Access Denied
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            You don't have admin privileges.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-indigo-400 underline cursor-pointer"
          >
            Go back to dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${users.length})` },
    { id: "posts", label: `Posts (${posts.length})` },
    {
      id: "disputes",
      label: `Disputes${stats?.openDisputes ? ` (${stats.openDisputes})` : ""}`,
    },
    {
      id: "reports",
      label: `Reports${stats?.pendingReports ? ` (${stats.pendingReports})` : ""}`,
    },
    {
      id: "withdrawals",
      label: `Withdrawals${withdrawals.filter((w) => w.status === "pending").length > 0 ? ` (${withdrawals.filter((w) => w.status === "pending").length})` : ""}`,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Admin Dashboard
            </h1>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              Platform management & analytics
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-[12px] px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
              style={{
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text-3)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === "overview" && stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Total Users"
                  value={stats.totalUsers}
                  color="indigo"
                />
                <StatCard
                  label="Total Posts"
                  value={stats.totalPosts}
                  color="violet"
                />
                <StatCard
                  label="Active Sessions"
                  value={stats.activeSessions}
                  color="amber"
                />
                <StatCard
                  label="Completed Sessions"
                  value={stats.completedSessions}
                  color="emerald"
                />
                <StatCard
                  label="Platform Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  sub="15% of all paid jobs"
                  color="emerald"
                />
                <StatCard
                  label="Open Disputes"
                  value={stats.openDisputes}
                  sub="Needs review"
                  color="red"
                />
                <StatCard
                  label="Pending Reports"
                  value={stats.pendingReports}
                  color="red"
                />
              </div>
            )}

            {/* ── USERS ── */}
            {tab === "users" && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-[12px]">
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg-card)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {[
                        "User",
                        "Rating",
                        "Reviews",
                        "Joined",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold"
                          style={{ color: "var(--text-3)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--bg-card)" : "var(--bg-raised)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td className="px-4 py-3">
                          <p
                            className="font-medium"
                            style={{ color: "var(--text-1)" }}
                          >
                            {u.full_name || "—"}
                          </p>
                          <p style={{ color: "var(--text-3)" }}>{u.email}</p>
                        </td>
                        <td className="px-4 py-3" style={{ color: "#fbbf24" }}>
                          {u.rating > 0
                            ? `⭐ ${Number(u.rating).toFixed(1)}`
                            : "—"}
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-2)" }}
                        >
                          {u.total_reviews || 0}
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatRelativeTime(u.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={
                              u.is_suspended
                                ? {
                                    background: "rgba(248,113,113,0.1)",
                                    color: "#f87171",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                  }
                                : {
                                    background: "rgba(52,211,153,0.1)",
                                    color: "#34d399",
                                    border: "1px solid rgba(52,211,153,0.2)",
                                  }
                            }
                          >
                            {u.is_suspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              handleSuspendUser(u.id, u.is_suspended)
                            }
                            className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-colors"
                            style={
                              u.is_suspended
                                ? {
                                    background: "rgba(52,211,153,0.1)",
                                    color: "#34d399",
                                    border: "1px solid rgba(52,211,153,0.2)",
                                  }
                                : {
                                    background: "rgba(248,113,113,0.1)",
                                    color: "#f87171",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                  }
                            }
                          >
                            {u.is_suspended ? "Unsuspend" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── POSTS ── */}
            {tab === "posts" && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-[12px]">
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg-card)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {[
                        "Course",
                        "Description",
                        "Budget",
                        "Status",
                        "Posted",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold"
                          style={{ color: "var(--text-3)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--bg-card)" : "var(--bg-raised)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: "#818cf8" }}
                        >
                          {p.course}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p
                            className="truncate"
                            style={{ color: "var(--text-2)" }}
                          >
                            {p.description}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: "#34d399" }}
                        >
                          {formatCurrency(p.budget)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                            style={
                              p.status === "open"
                                ? {
                                    background: "rgba(52,211,153,0.1)",
                                    color: "#34d399",
                                  }
                                : p.status === "in_progress"
                                  ? {
                                      background: "rgba(251,191,36,0.1)",
                                      color: "#fbbf24",
                                    }
                                  : {
                                      background: "var(--bg-hover)",
                                      color: "var(--text-3)",
                                    }
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatRelativeTime(p.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeletePost(p.id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer font-medium"
                            style={{
                              background: "rgba(248,113,113,0.1)",
                              color: "#f87171",
                              border: "1px solid rgba(248,113,113,0.2)",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── DISPUTES ── */}
            {tab === "disputes" && (
              <div className="flex flex-col gap-3">
                {disputes.length === 0 ? (
                  <div
                    className="text-center py-16 rounded-2xl"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p className="text-3xl mb-2">⚖️</p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-1)" }}
                    >
                      No disputes yet
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-3)" }}
                    >
                      Disputes will appear here when users raise them
                    </p>
                  </div>
                ) : (
                  disputes.map((d) => {
                    const isOpen =
                      d.status === "open" || d.status === "under_review";
                    const statusColors = {
                      open: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
                      under_review: {
                        bg: "rgba(251,191,36,0.1)",
                        color: "#fbbf24",
                      },
                      resolved_helper: {
                        bg: "rgba(52,211,153,0.1)",
                        color: "#34d399",
                      },
                      resolved_student: {
                        bg: "rgba(96,165,250,0.1)",
                        color: "#60a5fa",
                      },
                      closed: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
                    };
                    const sc = statusColors[d.status] ?? statusColors.open;
                    const course = d.work_sessions?.posts?.course ?? "—";
                    const budget = d.work_sessions?.posts?.budget;

                    return (
                      <div
                        key={d.id}
                        className="rounded-2xl p-4"
                        style={{
                          background: "var(--bg-card)",
                          border: isOpen
                            ? "1px solid rgba(239,68,68,0.25)"
                            : "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Status + course */}
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                                style={{ background: sc.bg, color: sc.color }}
                              >
                                {d.status.replace("_", " ")}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(99,102,241,0.1)",
                                  color: "#818cf8",
                                }}
                              >
                                {course}
                              </span>
                              {budget && (
                                <span
                                  className="text-[11px] font-bold"
                                  style={{ color: "#34d399" }}
                                >
                                  {formatCurrency(budget)}
                                </span>
                              )}
                            </div>

                            {/* Reason */}
                            <p
                              className="text-[13px] font-semibold"
                              style={{ color: "var(--text-1)" }}
                            >
                              {d.reason}
                            </p>

                            {/* Resolution if resolved */}
                            {d.resolution && (
                              <p
                                className="text-[11px] mt-0.5 italic"
                                style={{ color: "var(--text-3)" }}
                              >
                                Resolution: {d.resolution}
                              </p>
                            )}

                            <p
                              className="text-[11px] mt-1"
                              style={{ color: "var(--text-3)" }}
                            >
                              Raised {formatRelativeTime(d.created_at)}
                              {d.updated_at !== d.created_at &&
                                ` · Updated ${formatRelativeTime(d.updated_at)}`}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => navigate(`/dispute/${d.id}`)}
                              className="text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors"
                              style={{
                                background: "rgba(99,102,241,0.1)",
                                color: "#818cf8",
                                border: "1px solid rgba(99,102,241,0.2)",
                              }}
                            >
                              View →
                            </button>
                            {d.status === "open" && (
                              <button
                                onClick={async () => {
                                  const { error } = await supabase.rpc(
                                    "mark_dispute_under_review",
                                    {
                                      p_dispute_id: d.id,
                                      p_admin_id: user.id,
                                    },
                                  );
                                  if (error) {
                                    toast.error(error.message);
                                  } else {
                                    toast.success("Marked as under review.");
                                    setDisputes((prev) =>
                                      prev.map((x) =>
                                        x.id === d.id
                                          ? { ...x, status: "under_review" }
                                          : x,
                                      ),
                                    );
                                  }
                                }}
                                className="text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors"
                                style={{
                                  background: "rgba(251,191,36,0.1)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(251,191,36,0.2)",
                                }}
                              >
                                🔍 Review
                              </button>
                            )}
                            {isOpen && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (
                                      !confirm("Resolve in favour of HELPER?")
                                    )
                                      return;
                                    const { error } = await supabase.rpc(
                                      "resolve_dispute_helper",
                                      {
                                        p_dispute_id: d.id,
                                        p_admin_id: user.id,
                                      },
                                    );
                                    if (error) {
                                      toast.error(error.message);
                                    } else {
                                      toast.success("Resolved — helper wins.");
                                      setDisputes((prev) =>
                                        prev.map((x) =>
                                          x.id === d.id
                                            ? {
                                                ...x,
                                                status: "resolved_helper",
                                              }
                                            : x,
                                        ),
                                      );
                                    }
                                  }}
                                  className="text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors"
                                  style={{
                                    background: "rgba(52,211,153,0.1)",
                                    color: "#34d399",
                                    border: "1px solid rgba(52,211,153,0.2)",
                                  }}
                                >
                                  ✅ Helper
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "Resolve in favour of STUDENT? This refunds payment.",
                                      )
                                    )
                                      return;
                                    const { error } = await supabase.rpc(
                                      "resolve_dispute_student",
                                      {
                                        p_dispute_id: d.id,
                                        p_admin_id: user.id,
                                      },
                                    );
                                    if (error) {
                                      toast.error(error.message);
                                    } else {
                                      toast.success(
                                        "Resolved — student refunded.",
                                      );
                                      setDisputes((prev) =>
                                        prev.map((x) =>
                                          x.id === d.id
                                            ? {
                                                ...x,
                                                status: "resolved_student",
                                              }
                                            : x,
                                        ),
                                      );
                                    }
                                  }}
                                  className="text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors"
                                  style={{
                                    background: "rgba(96,165,250,0.1)",
                                    color: "#60a5fa",
                                    border: "1px solid rgba(96,165,250,0.2)",
                                  }}
                                >
                                  💳 Student
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── REPORTS ── */}
            {tab === "reports" && (
              <div className="flex flex-col gap-3">
                {reports.length === 0 ? (
                  <p
                    className="text-center py-12 text-sm"
                    style={{ color: "var(--text-3)" }}
                  >
                    No reports yet.
                  </p>
                ) : (
                  reports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                              style={
                                r.type === "user"
                                  ? {
                                      background: "rgba(99,102,241,0.1)",
                                      color: "#818cf8",
                                    }
                                  : {
                                      background: "rgba(251,191,36,0.1)",
                                      color: "#fbbf24",
                                    }
                              }
                            >
                              {r.type} report
                            </span>
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                              style={
                                r.status === "pending"
                                  ? {
                                      background: "rgba(248,113,113,0.1)",
                                      color: "#f87171",
                                    }
                                  : {
                                      background: "rgba(52,211,153,0.1)",
                                      color: "#34d399",
                                    }
                              }
                            >
                              {r.status}
                            </span>
                          </div>
                          <p
                            className="text-[13px] font-semibold"
                            style={{ color: "var(--text-1)" }}
                          >
                            {r.reason}
                          </p>
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "var(--text-3)" }}
                          >
                            {formatRelativeTime(r.created_at)}
                          </p>
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                handleResolveReport(r.id, "resolved")
                              }
                              className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer font-medium"
                              style={{
                                background: "rgba(52,211,153,0.1)",
                                color: "#34d399",
                                border: "1px solid rgba(52,211,153,0.2)",
                              }}
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() =>
                                handleResolveReport(r.id, "dismissed")
                              }
                              className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer font-medium"
                              style={{
                                background: "var(--bg-hover)",
                                color: "var(--text-3)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── WITHDRAWALS ── */}
            {tab === "withdrawals" && (
              <div className="flex flex-col gap-3">
                {withdrawals.length === 0 ? (
                  <p
                    className="text-center py-12 text-sm"
                    style={{ color: "var(--text-3)" }}
                  >
                    No withdrawal requests yet.
                  </p>
                ) : (
                  withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="text-[13px] font-bold"
                              style={{ color: "#34d399" }}
                            >
                              {formatCurrency(w.amount)}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={
                                w.status === "completed"
                                  ? {
                                      background: "rgba(52,211,153,0.1)",
                                      color: "#34d399",
                                    }
                                  : w.status === "processing"
                                    ? {
                                        background: "rgba(251,191,36,0.1)",
                                        color: "#fbbf24",
                                      }
                                    : {
                                        background: "rgba(248,113,113,0.1)",
                                        color: "#f87171",
                                      }
                              }
                            >
                              {w.status}
                            </span>
                          </div>
                          <p
                            className="text-[12px]"
                            style={{ color: "var(--text-2)" }}
                          >
                            {w.profiles?.full_name || "—"} ·{" "}
                            {w.profiles?.email || "—"}
                          </p>
                          {w.bank_details && (
                            <p
                              className="text-[11px] mt-1"
                              style={{ color: "var(--text-3)" }}
                            >
                              {w.bank_details.bank_name} ·{" "}
                              {w.bank_details.account_number} ·{" "}
                              {w.bank_details.account_name}
                            </p>
                          )}
                          <p
                            className="text-[11px] mt-1"
                            style={{ color: "var(--text-3)" }}
                          >
                            {formatRelativeTime(w.created_at)}
                          </p>
                        </div>
                        {w.status === "pending" && (
                          <button
                            onClick={() =>
                              handleMarkWithdrawalPaid(w.id, w.helper_id)
                            }
                            className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors"
                            style={{
                              background: "rgba(52,211,153,0.1)",
                              color: "#34d399",
                              border: "1px solid rgba(52,211,153,0.2)",
                            }}
                          >
                            ✓ Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
