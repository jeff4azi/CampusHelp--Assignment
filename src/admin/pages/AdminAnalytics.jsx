import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

function MetricCard({ label, value, sub, color = "#818cf8" }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

const DAYS_OPTIONS = [7, 14, 30, 90];
const PIE_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const [
      { data: payments },
      { data: sessions },
      { data: profiles },
      { data: posts },
      { data: withdrawals },
    ] = await Promise.all([
      supabase
        .from("payments")
        .select("platform_fee, amount, status, created_at")
        .gte("created_at", cutoffStr),
      supabase
        .from("work_sessions")
        .select("id, status, amount, created_at")
        .gte("created_at", cutoffStr),
      supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", cutoffStr),
      supabase
        .from("posts")
        .select("id, status, budget, created_at")
        .gte("created_at", cutoffStr),
      supabase
        .from("withdrawals")
        .select("amount, status, created_at")
        .gte("created_at", cutoffStr),
    ]);

    const successPayments = (payments || []).filter(
      (p) => p.status === "success",
    );
    const totalRevenue = successPayments.reduce(
      (s, p) => s + (Number(p.platform_fee) || 0),
      0,
    );
    const totalVolume = successPayments.reduce(
      (s, p) => s + (Number(p.amount) || 0),
      0,
    );
    const completedSessions = (sessions || []).filter(
      (s) => s.status === "completed",
    ).length;
    const totalPosts = (posts || []).length;
    const conversionRate =
      totalPosts > 0
        ? ((completedSessions / totalPosts) * 100).toFixed(1)
        : "0";

    // Daily revenue
    const revMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      revMap[key] = { day: key, revenue: 0, volume: 0, sessions: 0 };
    }
    successPayments.forEach((p) => {
      const key = new Date(p.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (revMap[key]) {
        revMap[key].revenue += Number(p.platform_fee) || 0;
        revMap[key].volume += Number(p.amount) || 0;
      }
    });
    (sessions || [])
      .filter((s) => s.status === "completed")
      .forEach((s) => {
        const key = new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (revMap[key]) revMap[key].sessions += 1;
      });

    // User growth
    const userMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      userMap[key] = { day: key, newUsers: 0 };
    }
    (profiles || []).forEach((p) => {
      const key = new Date(p.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (userMap[key]) userMap[key].newUsers += 1;
    });

    // Post status breakdown (pie)
    const statusCounts = {};
    (posts || []).forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    const postPie = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setData({
      totalRevenue,
      totalVolume,
      completedSessions,
      totalPosts,
      conversionRate,
      newUsers: (profiles || []).length,
      pendingWithdrawals: (withdrawals || [])
        .filter((w) => w.status === "pending")
        .reduce((s, w) => s + Number(w.amount), 0),
      revenueChart: Object.values(revMap),
      userChart: Object.values(userMap),
      postPie,
    });
    setLoading(false);
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Analytics
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              Platform performance metrics
            </p>
          </div>
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all"
                style={{
                  background: days === d ? "var(--accent)" : "transparent",
                  color: days === d ? "#fff" : "var(--text-3)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              <MetricCard
                label="Platform Revenue"
                value={formatCurrency(data.totalRevenue)}
                sub="15% fee collected"
                color="#34d399"
              />
              <MetricCard
                label="Transaction Volume"
                value={formatCurrency(data.totalVolume)}
                sub="Total paid by students"
                color="#818cf8"
              />
              <MetricCard
                label="Completed Sessions"
                value={data.completedSessions}
                color="#fbbf24"
              />
              <MetricCard
                label="Conversion Rate"
                value={`${data.conversionRate}%`}
                sub="Jobs posted → completed"
                color="#a78bfa"
              />
              <MetricCard
                label="New Users"
                value={data.newUsers}
                color="#60a5fa"
              />
              <MetricCard
                label="New Posts"
                value={data.totalPosts}
                color="#818cf8"
              />
              <MetricCard
                label="Pending Payouts"
                value={formatCurrency(data.pendingWithdrawals)}
                color="#f87171"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Revenue + volume */}
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
                  Revenue vs Volume
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={data.revenueChart}
                    margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#818cf8"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#818cf8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
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
                      interval={Math.floor(days / 7)}
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
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fill="url(#volGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#revGrad2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* User growth */}
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
                  User Growth
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.userChart}
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
                      interval={Math.floor(days / 7)}
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

              {/* Sessions completed */}
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
                  Sessions Completed
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data.revenueChart}
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
                      interval={Math.floor(days / 7)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      name="Sessions"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Post status pie */}
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
                  Post Status Breakdown
                </p>
                {data.postPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.postPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {data.postPie.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="flex items-center justify-center h-48"
                    style={{ color: "var(--text-3)" }}
                  >
                    No data
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
