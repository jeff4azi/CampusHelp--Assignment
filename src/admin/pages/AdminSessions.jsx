import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import toast from "react-hot-toast";

export default function AdminSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("work_sessions")
      .select(
        "id, status, payment_status, amount, platform_fee, created_at, owner_id, helper_id, posts(course, description, budget), payments(escrow_status, withdrawal_status)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    setSessions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    const matchFilter = filter === "all" || s.status === filter;
    const matchSearch =
      !search ||
      (s.posts?.course || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusStyle = {
    active: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    completed: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
  };

  const escrowStyle = {
    held: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    released: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
    disputed: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
    refunded: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
  };

  const counts = {
    all: sessions.length,
    active: sessions.filter((s) => s.status === "active").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Sessions
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {counts.active} active · {counts.completed} completed
            </p>
          </div>
          <button
            onClick={fetchSessions}
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

        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course…"
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
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer capitalize transition-all"
                style={{
                  background: filter === f ? "var(--accent)" : "transparent",
                  color: filter === f ? "#fff" : "var(--text-3)",
                }}
              >
                {f} {counts[f] > 0 && `(${counts[f]})`}
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
          <div className="flex flex-col gap-3">
            {filtered.map((s) => {
              const ss = statusStyle[s.status] ?? statusStyle.active;
              const escrow = s.payments?.[0]?.escrow_status ?? "held";
              const es = escrowStyle[escrow] ?? escrowStyle.held;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                          style={{
                            background: "rgba(99,102,241,0.1)",
                            color: "#818cf8",
                          }}
                        >
                          {s.posts?.course ?? "—"}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: ss.bg, color: ss.color }}
                        >
                          {s.status}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: es.bg, color: es.color }}
                        >
                          {escrow}
                        </span>
                        {s.amount && (
                          <span
                            className="text-[12px] font-bold"
                            style={{ color: "#34d399" }}
                          >
                            {formatCurrency(s.amount)}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[12px] truncate mb-1"
                        style={{ color: "var(--text-2)" }}
                      >
                        {s.posts?.description ?? "—"}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-3)" }}
                      >
                        {formatRelativeTime(s.created_at)} · Owner:{" "}
                        {s.owner_id?.slice(0, 8)}… · Helper:{" "}
                        {s.helper_id?.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {escrow === "disputed" && (
                        <button
                          onClick={() => navigate(`/admin/disputes`)}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          ⚖️ Dispute
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--text-3)" }}
              >
                No sessions found.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
