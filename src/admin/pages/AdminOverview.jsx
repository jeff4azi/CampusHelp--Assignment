import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, onClick }) {
  const palette = {
    indigo: {
      text: "#818cf8",
      bg: "rgba(99,102,241,0.08)",
      border: "rgba(99,102,241,0.18)",
    },
    emerald: {
      text: "#34d399",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.18)",
    },
    amber: {
      text: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.18)",
    },
    red: {
      text: "#f87171",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.18)",
    },
    violet: {
      text: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.18)",
    },
    blue: {
      text: "#60a5fa",
      bg: "rgba(96,165,250,0.08)",
      border: "rgba(96,165,250,0.18)",
    },
  };
  const c = palette[color] ?? palette.indigo;
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 flex flex-col gap-3 ${onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}`}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {onClick && (
          <span className="text-[11px]" style={{ color: c.text }}>
            View →
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: c.text }}>
          {value ?? "—"}
        </p>
        <p
          className="text-[12px] font-semibold mt-0.5"
          style={{ color: "var(--text-2)" }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-2)" }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: profiles },
        { data: posts },
        { data: sessions },
        { data: payments },
        { data: withdrawals },
        { data: disputes },
        { data: reports },
      ] = await Promise.all([
        supabase.from("profiles").select("id, created_at, is_suspended"),
        supabase.from("posts").select("id, status, created_at"),
        supabase
          .from("work_sessions")
          .select("id, status, amount, platform_fee, created_at"),
        supabase
          .from("payments")
          .select("id, platform_fee, status, amount, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("withdrawals")
          .select("id, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("disputes")
          .select("id, status, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("reports")
          .select("id, status, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const totalRevenue = (payments || [])
        .filter((p) => p.status === "success")
        .reduce((s, p) => s + (Number(p.platform_fee) || 0), 0);

      const pendingWithdrawals = (withdrawals || []).filter(
        (w) => w.status === "pending",
      );
      const openDisputes = (disputes || []).filter(
        (d) => d.status === "open" || d.status === "under_review",
      );

      setStats({
        totalUsers: profiles?.length ?? 0,
        activeUsers: (profiles || []).filter((p) => !p.is_suspended).length,
        totalPosts: posts?.length ?? 0,
        openPosts: (posts || []).filter((p) => p.status === "open").length,
        activeSessions: (sessions || []).filter((s) => s.status === "active")
          .length,
        completedSessions: (sessions || []).filter(
          (s) => s.status === "completed",
        ).length,
        totalRevenue,
        pendingWithdrawals: pendingWithdrawals.length,
        pendingWithdrawalAmount: pendingWithdrawals.reduce(
          (s, w) => s + Number(w.amount),
          0,
        ),
        openDisputes: openDisputes.length,
        pendingReports: (reports || []).filter((r) => r.status === "pending")
          .length,
      });

      setBadge({
        disputes: openDisputes.length,
        withdrawals: pendingWithdrawals.length,
      });

      // ── Build revenue chart (last 14 days) ──────────────────────────
      const revMap = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        revMap[key] = { day: key, revenue: 0, transactions: 0 };
      }
      (payments || [])
        .filter((p) => p.status === "success")
        .forEach((p) => {
          const d = new Date(p.created_at);
          const key = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          if (revMap[key]) {
            revMap[key].revenue += Number(p.platform_fee) || 0;
            revMap[key].transactions += 1;
          }
        });
      setRevenueData(Object.values(revMap));

      // ── Build user growth chart (last 14 days) ───────────────────────
      const userMap = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        userMap[key] = { day: key, newUsers: 0 };
      }
      (profiles || []).forEach((p) => {
        const d = new Date(p.created_at);
        const key = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (userMap[key]) userMap[key].newUsers += 1;
      });
      setUserGrowth(Object.values(userMap));

      // ── Recent activity feed ─────────────────────────────────────────
      const activity = [
        ...(disputes || []).slice(0, 3).map((d) => ({
          id: d.id,
          type: "dispute",
          icon: "⚖️",
          text: `Dispute: ${d.reason}`,
          time: d.created_at,
          color: "#f87171",
          link: `/dispute/${d.id}`,
        })),
        ...(withdrawals || []).slice(0, 3).map((w) => ({
          id: w.id,
          type: "withdrawal",
          icon: "💸",
          text: `Withdrawal: ${formatCurrency(w.amount)} — ${w.status}`,
          time: w.created_at,
          color: "#fbbf24",
          link: "/admin/withdrawals",
        })),
        ...(reports || []).slice(0, 2).map((r) => ({
          id: r.id,
          type: "report",
          icon: "🚩",
          text: `Report: ${r.reason}`,
          time: r.created_at,
          color: "#f97316",
          link: "/admin/disputes",
        })),
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 8);

      setRecentActivity(activity);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <AdminLayout badge={badge}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Platform Overview
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              Real-time platform health
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Stat cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              <StatCard
                icon="👥"
                label="Total Users"
                value={stats.totalUsers}
                color="indigo"
                onClick={() => navigate("/admin/users")}
              />
              <StatCard
                icon="📋"
                label="Open Jobs"
                value={stats.openPosts}
                sub={`${stats.totalPosts} total`}
                color="violet"
                onClick={() => navigate("/admin/posts")}
              />
              <StatCard
                icon="🤝"
                label="Active Sessions"
                value={stats.activeSessions}
                sub={`${stats.completedSessions} completed`}
                color="amber"
                onClick={() => navigate("/admin/sessions")}
              />
              <StatCard
                icon="💰"
                label="Platform Revenue"
                value={formatCurrency(stats.totalRevenue)}
                sub="15% fee"
                color="emerald"
              />
              <StatCard
                icon="💸"
                label="Pending Withdrawals"
                value={stats.pendingWithdrawals}
                sub={formatCurrency(stats.pendingWithdrawalAmount)}
                color="amber"
                onClick={() => navigate("/admin/withdrawals")}
              />
              <StatCard
                icon="⚖️"
                label="Open Disputes"
                value={stats.openDisputes}
                color="red"
                onClick={() => navigate("/admin/disputes")}
              />
              <StatCard
                icon="🚩"
                label="Pending Reports"
                value={stats.pendingReports}
                color="red"
                onClick={() => navigate("/admin/disputes")}
              />
              <StatCard
                icon="✅"
                label="Active Users"
                value={stats.activeUsers}
                sub="not suspended"
                color="blue"
              />
            </div>

            {/* ── Charts ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              {/* Revenue chart */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[13px] font-bold mb-4"
                  style={{ color: "var(--text-1)" }}
                >
                  Revenue (Last 14 Days)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={revenueData}
                    margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#34d399"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#34d399"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v) => formatCurrency(v)} />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* User growth chart */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[13px] font-bold mb-4"
                  style={{ color: "var(--text-1)" }}
                >
                  New Users (Last 14 Days)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={userGrowth}
                    margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="newUsers"
                      name="New Users"
                      fill="#818cf8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Recent activity ──────────────────────────────────── */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-[13px] font-bold mb-4"
                style={{ color: "var(--text-1)" }}
              >
                Recent Activity
              </p>
              {recentActivity.length === 0 ? (
                <p
                  className="text-[13px] text-center py-8"
                  style={{ color: "var(--text-3)" }}
                >
                  No recent activity
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentActivity.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => navigate(item.link)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-opacity hover:opacity-75"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      <p
                        className="flex-1 text-[12px] truncate"
                        style={{ color: "var(--text-2)" }}
                      >
                        {item.text}
                      </p>
                      <span
                        className="text-[11px] shrink-0"
                        style={{ color: "var(--text-3)" }}
                      >
                        {formatRelativeTime(item.time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
