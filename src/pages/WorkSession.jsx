import { useEffect, useState, Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import { usePosts } from "../hooks/usePosts.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import { supabase } from "../lib/supabase.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import SessionChat from "../components/SessionChat.jsx";
import ReviewModal from "../components/ReviewModal.jsx";
import DisputeModal from "../components/DisputeModal.jsx";
import toast from "react-hot-toast";

// ── Error boundary for chat (graceful fallback if table missing) ──────────
class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
            Chat unavailable
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            Run migration 005 in Supabase to enable real-time chat.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Phone normalisation ───────────────────────────────────────────────────
function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "234" + digits.slice(1);
  }
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("+")) return digits.slice(1);
  return digits;
}

function buildWhatsAppLink({ phone, course, budget, description, role }) {
  const budgetStr = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(budget);
  const snippet =
    description?.length > 80 ? description.slice(0, 80) + "…" : description;
  const msg =
    role === "owner"
      ? `Hi! I'm the student on CampusHelp — I accepted your offer for *${course}* (${budgetStr}). "${snippet}" — let's coordinate here!`
      : `Hi! I'm the helper on CampusHelp for *${course}* (${budgetStr}). "${snippet}" — my offer was accepted, let's get started!`;

  const normalised = normalisePhone(phone);
  const base = normalised ? `https://wa.me/${normalised}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(msg)}`;
}

// ── Tab button ────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all cursor-pointer"
      style={
        active
          ? {
              background: "var(--accent)",
              color: "#fff",
              boxShadow: "var(--shadow-btn)",
            }
          : {
              background: "transparent",
              color: "var(--text-3)",
            }
      }
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function WorkSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const { sessions, sessionsLoading, completeSession } = useSessions();
  const { syncPostStatus } = usePosts();
  const navigate = useNavigate();

  const [completing, setCompleting] = useState(false);
  const [otherPhone, setOtherPhone] = useState(null);
  const [otherName, setOtherName] = useState(null);
  const [myPhone, setMyPhone] = useState(null);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showReview, setShowReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [escrowStatus, setEscrowStatus] = useState(null); // held | released | disputed
  const [activeDispute, setActiveDispute] = useState(null);

  const session = sessions.find((s) => s.id === id);

  useEffect(() => {
    if (!sessionsLoading && !session) navigate("/dashboard", { replace: true });
  }, [sessionsLoading, session, navigate]);

  // Fetch the other user's profile + escrow status + active dispute
  useEffect(() => {
    if (!session || !user?.id) return;
    const otherId =
      user.id === session.ownerId ? session.helperId : session.ownerId;

    async function loadProfiles() {
      setProfilesLoading(true);
      const [{ data: otherData }, { data: myData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("id", otherId)
          .single(),
        supabase.from("profiles").select("phone").eq("id", user.id).single(),
      ]);
      setOtherPhone(otherData?.phone ?? null);
      setOtherName(otherData?.full_name ?? null);
      setMyPhone(myData?.phone ?? null);
      setProfilesLoading(false);
      if (!myData?.phone) setShowPhoneModal(true);
    }

    async function loadEscrow() {
      const { data: payment } = await supabase
        .from("payments")
        .select("escrow_status")
        .eq("session_id", session.id)
        .maybeSingle();
      if (payment) setEscrowStatus(payment.escrow_status ?? "held");

      const { data: dispute } = await supabase
        .from("disputes")
        .select("id, status, reason")
        .eq("session_id", session.id)
        .in("status", ["open", "under_review"])
        .maybeSingle();
      if (dispute) setActiveDispute(dispute);
    }

    loadProfiles();
    loadEscrow();
  }, [session?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sessionsLoading || !session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full text-[var(--text-3)] text-sm animate-pulse">
          Loading session…
        </div>
      </DashboardLayout>
    );
  }

  const post = session.post;
  const isOwner = user?.id === session.ownerId;
  const isHelper = user?.id === session.helperId;
  const isActive = session.status === "active";
  const role = isOwner ? "Owner" : "Helper";
  const otherId = isOwner ? session.helperId : session.ownerId;

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeSession(session.id, user.id, isOwner ? "owner" : "helper");
      if (session.postId) syncPostStatus(session.postId, "completed");
      toast.success("Session marked as completed! 🎉");
      // Auto-prompt review if not already reviewed
      if (!hasReviewed) {
        setTimeout(() => setShowReview(true), 800);
      }
    } catch {
      toast.error("Failed to complete session. Please try again.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 pt-6 pb-12 max-w-2xl mx-auto">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--text-2)] hover:text-[var(--text-1)] text-sm transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span style={{ color: "var(--border)" }}>|</span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              isActive
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {isActive ? "Active Session" : "Completed"}
          </span>
          {/* Escrow status badge */}
          {escrowStatus && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium border"
              style={
                escrowStatus === "held"
                  ? {
                      background: "rgba(251,191,36,0.1)",
                      color: "#fbbf24",
                      borderColor: "rgba(251,191,36,0.2)",
                    }
                  : escrowStatus === "disputed"
                    ? {
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        borderColor: "rgba(239,68,68,0.2)",
                      }
                    : {
                        background: "rgba(52,211,153,0.1)",
                        color: "#34d399",
                        borderColor: "rgba(52,211,153,0.2)",
                      }
              }
            >
              {escrowStatus === "held"
                ? "🔒 Escrow"
                : escrowStatus === "disputed"
                  ? "⚠️ Frozen"
                  : "✅ Released"}
            </span>
          )}
          <span className="text-xs text-[var(--text-3)] ml-auto">
            You are the{" "}
            <span className="text-[var(--text-2)] font-medium">{role}</span>
          </span>
        </div>

        {/* ── Tab switcher ────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-5"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
          }}
        >
          <Tab
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
          >
            💬 Chat
          </Tab>
          <Tab
            active={activeTab === "details"}
            onClick={() => setActiveTab("details")}
          >
            📋 Details
          </Tab>
        </div>

        {/* ── Chat tab ────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div className="flex flex-col gap-4">
            <ChatErrorBoundary>
              <SessionChat
                sessionId={session.id}
                otherUserId={otherId}
                otherName={otherName}
                isSessionActive={isActive}
              />
            </ChatErrorBoundary>

            {/* WhatsApp as secondary option */}
            {isActive && (isOwner || isHelper) && post && !profilesLoading && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs font-medium mb-2.5"
                  style={{ color: "var(--text-3)" }}
                >
                  Prefer WhatsApp?
                </p>
                <a
                  href={buildWhatsAppLink({
                    phone: otherPhone,
                    course: post.course,
                    budget: post.budget,
                    description: post.description,
                    role: isOwner ? "owner" : "helper",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    background: "rgba(37,211,102,0.1)",
                    border: "1px solid rgba(37,211,102,0.25)",
                    color: "#25d366",
                  }}
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Also contact via WhatsApp
                </a>
              </div>
            )}

            {/* Complete button */}
            {isActive && (isOwner || isHelper) && (
              <button
                onClick={handleComplete}
                disabled={completing || !!activeDispute}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
              >
                {completing ? "Marking as completed…" : "✓ Mark as Completed"}
              </button>
            )}

            {/* Active dispute banner */}
            {activeDispute && (
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <span className="text-lg shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-red-400">
                    Dispute in progress
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-3)" }}
                  >
                    Reason: {activeDispute.reason}. Funds are frozen until our
                    team resolves this.
                  </p>
                  {activeDispute.id && activeDispute.id !== "Submitted" && (
                    <button
                      onClick={() => navigate(`/dispute/${activeDispute.id}`)}
                      className="text-[11px] font-semibold mt-1.5 cursor-pointer transition-colors"
                      style={{ color: "#818cf8" }}
                    >
                      View dispute details →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Raise dispute */}
            {isActive && !activeDispute && (
              <button
                onClick={() => setShowDispute(true)}
                className="w-full py-2.5 text-[12px] font-semibold rounded-2xl transition-colors cursor-pointer"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#f87171",
                }}
              >
                ⚠️ Raise a Dispute
              </button>
            )}

            {!isActive && (
              <div
                className="text-center py-4 text-sm rounded-2xl"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-3)",
                }}
              >
                ✓ This session has been completed
              </div>
            )}
          </div>
        )}

        {/* ── Details tab ─────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="flex flex-col gap-4">
            {/* Assignment card */}
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                  {post?.course ?? "—"}
                </span>
                <span className="text-emerald-400 font-semibold text-sm">
                  {post ? formatCurrency(post.budget) : "—"}
                </span>
              </div>
              <p className="text-[var(--text-1)] text-sm leading-relaxed">
                {post?.description ?? "—"}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-3">
                Session started {formatRelativeTime(session.createdAt)}
              </p>
            </div>

            {/* Participants */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-[var(--text-3)] mb-1">
                  Student (Owner)
                </p>
                <p className="text-sm text-[var(--text-1)] font-medium truncate">
                  {session.ownerId === user?.id
                    ? "You"
                    : session.ownerId.slice(0, 8) + "…"}
                </p>
              </div>
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-[var(--text-3)] mb-1">Helper</p>
                <p className="text-sm text-[var(--text-1)] font-medium truncate">
                  {session.helperId === user?.id
                    ? "You"
                    : (otherName ?? session.helperId.slice(0, 8) + "…")}
                </p>
              </div>
            </div>

            {/* Payment info */}
            {session.amount && (
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-[var(--text-3)] mb-2">
                  Payment Details
                </p>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-2)" }}>Total paid</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(session.amount)}
                  </span>
                </div>
                {session.platformFee && (
                  <div className="flex justify-between text-sm mt-1.5">
                    <span style={{ color: "var(--text-2)" }}>
                      Platform fee (15%)
                    </span>
                    <span style={{ color: "var(--text-3)" }}>
                      {formatCurrency(session.platformFee)}
                    </span>
                  </div>
                )}
                {session.amount && session.platformFee && (
                  <div
                    className="flex justify-between text-sm mt-2 pt-2"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span style={{ color: "var(--text-2)" }}>Helper earns</span>
                    <span className="font-bold text-indigo-400">
                      {formatCurrency(session.amount - session.platformFee)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* No-phone banner */}
            {isActive && !profilesLoading && !myPhone && (
              <button
                onClick={() => setShowPhoneModal(true)}
                className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left cursor-pointer transition-all"
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}
              >
                <span className="text-lg shrink-0">📱</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-amber-400">
                    Add your WhatsApp number
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-2)" }}
                  >
                    Tap to add your number so your match can reach you
                  </p>
                </div>
                <span className="text-amber-400 text-lg ml-auto shrink-0">
                  →
                </span>
              </button>
            )}

            {/* Complete button */}
            {isActive && (isOwner || isHelper) && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
              >
                {completing ? "Marking as completed…" : "✓ Mark as Completed"}
              </button>
            )}

            {!isActive && (
              <div className="text-center py-4 text-sm text-[var(--text-3)]">
                This session has been completed.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Review modal — auto-shown after completion ───────────── */}
      {showReview && session && (
        <ReviewModal
          session={session}
          revieweeId={isOwner ? session.helperId : session.ownerId}
          revieweeName={otherName ?? (isOwner ? "the helper" : "the student")}
          onClose={() => setShowReview(false)}
          onSubmitted={() => setHasReviewed(true)}
        />
      )}

      {/* ── Dispute modal ─────────────────────────────────────────── */}
      {showDispute && session && (
        <DisputeModal
          session={session}
          onClose={() => setShowDispute(false)}
          onSubmitted={(disputeId) => {
            setActiveDispute({
              id: disputeId,
              status: "open",
              reason: "Submitted",
            });
            setEscrowStatus("disputed");
          }}
        />
      )}

      {/* ── Phone number modal ───────────────────────────────────── */}
      {showPhoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setShowPhoneModal(false)
          }
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 fade-in"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid rgba(251,191,36,0.3)",
              boxShadow: "var(--shadow-card)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.2)",
              }}
            >
              <span className="text-2xl">📱</span>
            </div>

            <h2
              className="text-[15px] font-bold text-center mb-2"
              style={{ color: "var(--text-1)" }}
            >
              Add your WhatsApp number
            </h2>
            <p
              className="text-[13px] text-center leading-relaxed mb-6"
              style={{ color: "var(--text-2)" }}
            >
              Your match needs your WhatsApp number to contact you outside the
              app. Without it, they can't reach you there.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  navigate("/settings");
                }}
                className="w-full py-3 text-white font-bold rounded-xl text-[13.5px] transition-all cursor-pointer active:scale-95"
                style={{
                  background: "var(--accent)",
                  boxShadow: "var(--shadow-btn)",
                }}
              >
                Go to Settings →
              </button>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="w-full py-2.5 text-[13px] font-medium rounded-xl cursor-pointer transition-colors"
                style={{
                  color: "var(--text-3)",
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border)",
                }}
              >
                I'll do it later
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
