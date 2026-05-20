import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { useAdminAuth } from "../hooks/useAdminAuth.js";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
  "all",
  "open",
  "under_review",
  "resolved_helper",
  "resolved_student",
  "closed",
];

const STATUS_STYLE = {
  open: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
  under_review: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
  resolved_helper: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
  resolved_student: { bg: "rgba(96,165,250,0.1)", color: "#60a5fa" },
  closed: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [activeTab, setActiveTab] = useState("disputes");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: r }] = await Promise.all([
      supabase
        .from("disputes")
        .select(
          "id, reason, description, status, created_at, updated_at, session_id, raised_by, resolution, work_sessions(owner_id, helper_id, posts(course, budget))",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("reports")
        .select(
          "id, type, reason, description, status, created_at, reporter_id, reported_user_id, reported_post_id",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setDisputes(d || []);
    setReports(r || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleMarkReview(id) {
    const { error } = await supabase.rpc("mark_dispute_under_review", {
      p_dispute_id: id,
      p_admin_id: adminUser.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as under review.");
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "under_review" } : d)),
    );
  }

  async function handleResolveHelper(id) {
    if (!confirm("Resolve in favour of HELPER? This releases funds to them."))
      return;
    const { error } = await supabase.rpc("resolve_dispute_helper", {
      p_dispute_id: id,
      p_admin_id: adminUser.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resolved — helper wins.");
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "resolved_helper" } : d)),
    );
  }

  async function handleResolveStudent(id) {
    if (!confirm("Resolve in favour of STUDENT? This refunds the payment."))
      return;
    const { error } = await supabase.rpc("resolve_dispute_student", {
      p_dispute_id: id,
      p_admin_id: adminUser.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resolved — student refunded.");
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "resolved_student" } : d)),
    );
  }

  async function handleResolveReport(id, resolution) {
    const { error } = await supabase
      .from("reports")
      .update({
        status: resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: adminUser.id,
      })
      .eq("id", id);
    if (error) {
      toast.error("Failed.");
      return;
    }
    toast.success(`Report ${resolution}.`);
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: resolution } : r)),
    );
  }

  const filteredDisputes =
    filter === "all" ? disputes : disputes.filter((d) => d.status === filter);
  const openCount = disputes.filter(
    (d) => d.status === "open" || d.status === "under_review",
  ).length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout badge={{ disputes: openCount }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Disputes & Reports
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {openCount} open disputes · {pendingReports} pending reports
            </p>
          </div>
          <button
            onClick={fetchAll}
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

        {/* Tab switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setActiveTab("disputes")}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all"
            style={{
              background:
                activeTab === "disputes" ? "var(--accent)" : "transparent",
              color: activeTab === "disputes" ? "#fff" : "var(--text-3)",
            }}
          >
            ⚖️ Disputes {openCount > 0 && `(${openCount})`}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all"
            style={{
              background:
                activeTab === "reports" ? "var(--accent)" : "transparent",
              color: activeTab === "reports" ? "#fff" : "var(--text-3)",
            }}
          >
            🚩 Reports {pendingReports > 0 && `(${pendingReports})`}
          </button>
        </div>

        {activeTab === "disputes" && (
          <>
            {/* Status filter */}
            <div
              className="flex gap-1 p-1 rounded-xl mb-5 flex-wrap"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer capitalize transition-all"
                  style={{
                    background: filter === f ? "var(--accent)" : "transparent",
                    color: filter === f ? "#fff" : "var(--text-3)",
                  }}
                >
                  {f.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton rounded-2xl h-24" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDisputes.map((d) => {
                  const ss = STATUS_STYLE[d.status] ?? STATUS_STYLE.open;
                  const isOpen =
                    d.status === "open" || d.status === "under_review";
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
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={{ background: ss.bg, color: ss.color }}
                            >
                              {d.status.replace(/_/g, " ")}
                            </span>
                            {d.work_sessions?.posts?.course && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(99,102,241,0.1)",
                                  color: "#818cf8",
                                }}
                              >
                                {d.work_sessions.posts.course}
                              </span>
                            )}
                            {d.work_sessions?.posts?.budget && (
                              <span
                                className="text-[11px] font-bold"
                                style={{ color: "#34d399" }}
                              >
                                {formatCurrency(d.work_sessions.posts.budget)}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[13px] font-semibold"
                            style={{ color: "var(--text-1)" }}
                          >
                            {d.reason}
                          </p>
                          {d.description && (
                            <p
                              className="text-[11px] mt-0.5 line-clamp-2"
                              style={{ color: "var(--text-2)" }}
                            >
                              {d.description}
                            </p>
                          )}
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
                            {formatRelativeTime(d.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => navigate(`/dispute/${d.id}`)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
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
                              onClick={() => handleMarkReview(d.id)}
                              className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
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
                                onClick={() => handleResolveHelper(d.id)}
                                className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
                                style={{
                                  background: "rgba(52,211,153,0.1)",
                                  color: "#34d399",
                                  border: "1px solid rgba(52,211,153,0.2)",
                                }}
                              >
                                ✅ Helper
                              </button>
                              <button
                                onClick={() => handleResolveStudent(d.id)}
                                className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
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
                })}
                {filteredDisputes.length === 0 && (
                  <div
                    className="text-center py-12"
                    style={{ color: "var(--text-3)" }}
                  >
                    No disputes found.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "reports" && (
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl p-4"
                style={{
                  background: "var(--bg-card)",
                  border:
                    r.status === "pending"
                      ? "1px solid rgba(249,115,22,0.25)"
                      : "1px solid var(--border)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
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
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={
                          r.status === "pending"
                            ? {
                                background: "rgba(249,115,22,0.1)",
                                color: "#f97316",
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
                    {r.description && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--text-2)" }}
                      >
                        {r.description}
                      </p>
                    )}
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "var(--text-3)" }}
                    >
                      {formatRelativeTime(r.created_at)}
                    </p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleResolveReport(r.id, "resolved")}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          color: "#34d399",
                          border: "1px solid rgba(52,211,153,0.2)",
                        }}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(r.id, "dismissed")}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer font-bold"
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
            ))}
            {reports.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--text-3)" }}
              >
                No reports.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
