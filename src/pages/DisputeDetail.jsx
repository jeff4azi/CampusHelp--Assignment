import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { supabase } from "../lib/supabase.js";
import { formatRelativeTime, formatCurrency } from "../utils/formatters.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import toast from "react-hot-toast";

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open: {
    label: "Open",
    color: "#f87171",
    bg: "rgba(239,68,68,0.1)",
    icon: "🔴",
  },
  under_review: {
    label: "Under Review",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    icon: "🔍",
  },
  resolved_helper: {
    label: "Resolved — Helper",
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    icon: "✅",
  },
  resolved_student: {
    label: "Resolved — Student",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    icon: "✅",
  },
  closed: {
    label: "Closed",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    icon: "🔒",
  },
};

// ── Timeline event ────────────────────────────────────────────────────────
function TimelineEvent({ icon, title, sub, color = "var(--text-3)" }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
        }}
      >
        {icon}
      </div>
      <div
        className="flex-1 min-w-0 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-1)" }}
        >
          {title}
        </p>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Evidence card ─────────────────────────────────────────────────────────
function EvidenceCard({ item }) {
  const isImage = item.file_type === "image";
  return (
    <a
      href={item.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-opacity hover:opacity-75"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
    >
      {isImage ? (
        <img
          src={item.file_url}
          alt={item.file_name}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
          style={{ background: "var(--bg-hover)" }}
        >
          📄
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-semibold truncate"
          style={{ color: "var(--text-1)" }}
        >
          {item.file_name}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
          {formatRelativeTime(item.created_at)} · Click to view
        </p>
      </div>
      <span className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>
        ↗
      </span>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DisputeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dispute, setDispute] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resolving, setResolving] = useState(null); // 'helper' | 'student' | 'review'
  const [adminNote, setAdminNote] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    if (!id || !user?.id) return;
    loadAll();
  }, [id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    const [{ data: disputeData }, { data: evidenceData }, { data: adminData }] =
      await Promise.all([
        supabase.from("disputes").select("*").eq("id", id).single(),
        supabase
          .from("dispute_evidence")
          .select("*")
          .eq("dispute_id", id)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
      ]);

    if (!disputeData) {
      toast.error("Dispute not found.");
      navigate("/dashboard");
      return;
    }

    setDispute(disputeData);
    setEvidence(evidenceData || []);
    setIsAdmin(adminData?.is_admin === true);

    // Load session + post info
    const { data: sessionData } = await supabase
      .from("work_sessions")
      .select("*, posts(course, description, budget)")
      .eq("id", disputeData.session_id)
      .single();

    setSession(sessionData);
    setLoading(false);
  }

  // ── Admin actions ─────────────────────────────────────────────────────
  async function handleMarkUnderReview() {
    setResolving("review");
    const { error } = await supabase.rpc("mark_dispute_under_review", {
      p_dispute_id: id,
      p_admin_id: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Dispute marked as under review.");
      setDispute((d) => ({ ...d, status: "under_review" }));
    }
    setResolving(null);
  }

  async function handleResolveHelper() {
    if (
      !confirm("Resolve in favour of the HELPER? This releases funds to them.")
    )
      return;
    setResolving("helper");
    const { error } = await supabase.rpc("resolve_dispute_helper", {
      p_dispute_id: id,
      p_admin_id: user.id,
      p_resolution: adminNote.trim() || "Resolved in favour of helper",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Resolved — funds released to helper.");
      setDispute((d) => ({
        ...d,
        status: "resolved_helper",
        resolution: adminNote || "Resolved in favour of helper",
      }));
    }
    setResolving(null);
  }

  async function handleResolveStudent() {
    if (!confirm("Resolve in favour of the STUDENT? This refunds the payment."))
      return;
    setResolving("student");
    const { error } = await supabase.rpc("resolve_dispute_student", {
      p_dispute_id: id,
      p_admin_id: user.id,
      p_resolution:
        adminNote.trim() || "Resolved in favour of student — refund issued",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Resolved — refund issued to student.");
      setDispute((d) => ({
        ...d,
        status: "resolved_student",
        resolution: adminNote || "Resolved in favour of student",
      }));
    }
    setResolving(null);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-3)" }}
          >
            Loading dispute…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!dispute) return null;

  const statusCfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;
  const isResolved = ["resolved_helper", "resolved_student", "closed"].includes(
    dispute.status,
  );
  const isParticipant =
    session &&
    (session.owner_id === user?.id || session.helper_id === user?.id);
  const isRaiser = dispute.raised_by === user?.id;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm transition-colors cursor-pointer"
            style={{ color: "var(--text-2)" }}
          >
            ← Back
          </button>
          <span style={{ color: "var(--border)" }}>|</span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.icon} {statusCfg.label}
          </span>
          {isAdmin && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold ml-auto"
              style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
            >
              Admin View
            </span>
          )}
        </div>

        {/* ── Dispute summary card ─────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--text-3)" }}
              >
                Dispute #{id.slice(0, 8)}
              </p>
              <h2
                className="text-[15px] font-bold"
                style={{ color: "var(--text-1)" }}
              >
                {dispute.reason}
              </h2>
            </div>
            <span
              className="text-[11px] shrink-0"
              style={{ color: "var(--text-3)" }}
            >
              {formatRelativeTime(dispute.created_at)}
            </span>
          </div>

          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            {dispute.description}
          </p>

          {/* Session info */}
          {session?.posts && (
            <div
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "#818cf8",
                  }}
                >
                  {session.posts.course}
                </span>
                <p
                  className="text-[12px] mt-1.5 line-clamp-1"
                  style={{ color: "var(--text-3)" }}
                >
                  {session.posts.description}
                </p>
              </div>
              <span
                className="text-[14px] font-bold shrink-0"
                style={{ color: "#34d399" }}
              >
                {formatCurrency(session.posts.budget)}
              </span>
            </div>
          )}
        </div>

        {/* ── Resolution card (if resolved) ───────────────────────── */}
        {isResolved && dispute.resolution && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-start gap-3"
            style={{
              background:
                dispute.status === "resolved_helper"
                  ? "rgba(52,211,153,0.06)"
                  : "rgba(96,165,250,0.06)",
              border: `1px solid ${dispute.status === "resolved_helper" ? "rgba(52,211,153,0.2)" : "rgba(96,165,250,0.2)"}`,
            }}
          >
            <span className="text-xl shrink-0">⚖️</span>
            <div>
              <p
                className="text-[13px] font-bold"
                style={{
                  color:
                    dispute.status === "resolved_helper"
                      ? "#34d399"
                      : "#60a5fa",
                }}
              >
                {statusCfg.label}
              </p>
              <p
                className="text-[12px] mt-0.5 leading-relaxed"
                style={{ color: "var(--text-2)" }}
              >
                {dispute.resolution}
              </p>
              {dispute.resolved_at && (
                <p
                  className="text-[11px] mt-1"
                  style={{ color: "var(--text-3)" }}
                >
                  Resolved {formatRelativeTime(dispute.resolved_at)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Evidence section ─────────────────────────────────────── */}
        <div className="mb-4">
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-3)" }}
          >
            Evidence ({evidence.length})
          </p>
          {evidence.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-2xl mb-1">📭</p>
              <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                No evidence uploaded
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {evidence.map((item) => (
                <EvidenceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        <div className="mb-4">
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-3)" }}
          >
            Timeline
          </p>
          <div className="flex flex-col gap-0">
            <TimelineEvent
              icon="⚠️"
              title="Dispute raised"
              sub={`${isRaiser ? "You" : "The other party"} raised this dispute · ${formatRelativeTime(dispute.created_at)}`}
            />
            <TimelineEvent
              icon="🔒"
              title="Escrow frozen"
              sub="Funds locked — neither party can withdraw until resolved"
              color="#f87171"
            />
            {dispute.status === "under_review" && (
              <TimelineEvent
                icon="🔍"
                title="Under review"
                sub="Our team is reviewing the evidence"
                color="#fbbf24"
              />
            )}
            {isResolved && (
              <TimelineEvent
                icon="✅"
                title={statusCfg.label}
                sub={
                  dispute.resolved_at
                    ? formatRelativeTime(dispute.resolved_at)
                    : ""
                }
                color="#34d399"
              />
            )}
            {!isResolved && (
              <TimelineEvent
                icon="⏳"
                title="Awaiting resolution"
                sub="Our team will review within 48 hours"
                color="var(--text-3)"
              />
            )}
          </div>
        </div>

        {/* ── What to expect ───────────────────────────────────────── */}
        {!isResolved && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--text-3)" }}
            >
              What happens next
            </p>
            <div className="flex flex-col gap-2">
              {[
                {
                  icon: "👀",
                  text: "Our team reviews all evidence within 48 hours",
                },
                {
                  icon: "📬",
                  text: "Both parties are notified of the outcome",
                },
                {
                  icon: "⚖️",
                  text: "If resolved in helper's favour — funds released",
                },
                {
                  icon: "💳",
                  text: "If resolved in student's favour — refund issued",
                },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="shrink-0">{icon}</span>
                  <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Admin panel ──────────────────────────────────────────── */}
        {isAdmin && !isResolved && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(99,102,241,0.05)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold" style={{ color: "#818cf8" }}>
                🛡 Admin Resolution Panel
              </p>
              <button
                onClick={() => setShowAdminPanel((v) => !v)}
                className="text-[11px] cursor-pointer"
                style={{ color: "var(--text-3)" }}
              >
                {showAdminPanel ? "Hide" : "Show"}
              </button>
            </div>

            {showAdminPanel && (
              <div className="flex flex-col gap-3">
                {/* Admin note */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-3)" }}
                  >
                    Resolution Note (optional)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note explaining the resolution decision…"
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] resize-none outline-none"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Mark under review */}
                  {dispute.status === "open" && (
                    <button
                      onClick={handleMarkUnderReview}
                      disabled={!!resolving}
                      className="py-2.5 rounded-xl text-[12px] font-bold cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                      style={{
                        background: "rgba(251,191,36,0.1)",
                        border: "1px solid rgba(251,191,36,0.3)",
                        color: "#fbbf24",
                      }}
                    >
                      {resolving === "review" ? "…" : "🔍 Review"}
                    </button>
                  )}

                  {/* Resolve → helper */}
                  <button
                    onClick={handleResolveHelper}
                    disabled={!!resolving}
                    className="py-2.5 rounded-xl text-[12px] font-bold cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                    style={{
                      background: "rgba(52,211,153,0.1)",
                      border: "1px solid rgba(52,211,153,0.3)",
                      color: "#34d399",
                    }}
                  >
                    {resolving === "helper" ? "…" : "✅ Helper Wins"}
                  </button>

                  {/* Resolve → student */}
                  <button
                    onClick={handleResolveStudent}
                    disabled={!!resolving}
                    className="py-2.5 rounded-xl text-[12px] font-bold cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                    style={{
                      background: "rgba(96,165,250,0.1)",
                      border: "1px solid rgba(96,165,250,0.3)",
                      color: "#60a5fa",
                    }}
                  >
                    {resolving === "student" ? "…" : "💳 Student Wins"}
                  </button>
                </div>

                <p
                  className="text-[10px] text-center"
                  style={{ color: "var(--text-3)" }}
                >
                  These actions are irreversible. Both parties will be notified
                  immediately.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
