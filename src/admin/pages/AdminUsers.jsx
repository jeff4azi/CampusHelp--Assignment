import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import { formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import toast from "react-hot-toast";

const FILTERS = ["all", "active", "suspended"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, rating, total_reviews, completed_jobs, completion_rate, trust_score, level_name, is_suspended, is_admin, created_at, last_active_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleSuspend(user) {
    const next = !user.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: next })
      .eq("id", user.id);
    if (error) {
      toast.error("Failed to update user.");
      return;
    }

    await supabase
      .rpc("log_admin_action", {
        p_action: next ? "suspend_user" : "unsuspend_user",
        p_target_type: "user",
        p_target_id: user.id,
      })
      .catch(() => {});

    toast.success(next ? "User suspended." : "User unsuspended.");
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_suspended: next } : u)),
    );
    if (selected?.id === user.id)
      setSelected((s) => ({ ...s, is_suspended: next }));
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "suspended"
          ? u.is_suspended
          : !u.is_suspended;
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Users
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {users.length} total
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="text-[12px] px-3 py-1.5 rounded-lg cursor-pointer font-medium"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-48 rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer capitalize transition-all"
                style={{
                  background: filter === f ? "var(--accent)" : "transparent",
                  color: filter === f ? "#fff" : "var(--text-3)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-14" />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="overflow-x-auto">
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
                      "Level",
                      "Rating",
                      "Jobs",
                      "Trust",
                      "Joined",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        style={{ color: "var(--text-3)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
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
                          className="font-semibold"
                          style={{ color: "var(--text-1)" }}
                        >
                          {u.full_name || "—"}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: "var(--text-3)" }}
                        >
                          {u.email}
                        </p>
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        style={{ color: "#818cf8" }}
                      >
                        {u.level_name || "Newbie"}
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
                        {u.completed_jobs || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-16 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "var(--border)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(u.trust_score || 0, 100)}%`,
                                background:
                                  (u.trust_score || 0) >= 70
                                    ? "#34d399"
                                    : "#fbbf24",
                              }}
                            />
                          </div>
                          <span style={{ color: "var(--text-3)" }}>
                            {Math.round(u.trust_score || 0)}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap"
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
                                }
                              : {
                                  background: "rgba(52,211,153,0.1)",
                                  color: "#34d399",
                                }
                          }
                        >
                          {u.is_suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSelected(u)}
                            className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-medium"
                            style={{
                              background: "rgba(99,102,241,0.1)",
                              color: "#818cf8",
                              border: "1px solid rgba(99,102,241,0.2)",
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-medium"
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--text-3)" }}
              >
                No users found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 fade-in"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="font-bold text-[15px]"
                style={{ color: "var(--text-1)" }}
              >
                User Profile
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                style={{
                  color: "var(--text-3)",
                  background: "var(--bg-hover)",
                }}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                ["Name", selected.full_name || "—"],
                ["Email", selected.email],
                ["Level", selected.level_name || "Newbie"],
                [
                  "Rating",
                  selected.rating > 0
                    ? `${Number(selected.rating).toFixed(1)} ⭐ (${selected.total_reviews} reviews)`
                    : "No reviews",
                ],
                ["Completed Jobs", selected.completed_jobs || 0],
                [
                  "Completion Rate",
                  `${Math.round(selected.completion_rate || 0)}%`,
                ],
                ["Trust Score", Math.round(selected.trust_score || 0)],
                [
                  "Status",
                  selected.is_suspended ? "🔴 Suspended" : "🟢 Active",
                ],
                ["Joined", new Date(selected.created_at).toLocaleDateString()],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-3)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: "var(--text-1)" }}
                  >
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleToggleSuspend(selected)}
              className="w-full mt-5 py-2.5 font-bold rounded-xl text-[13px] cursor-pointer active:scale-95 transition-all text-white"
              style={
                selected.is_suspended
                  ? { background: "#16a34a" }
                  : { background: "#dc2626" }
              }
            >
              {selected.is_suspended ? "Unsuspend User" : "Suspend User"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
