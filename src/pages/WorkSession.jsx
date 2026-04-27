import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import { supabase } from "../lib/supabase.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";

// ── Phone normalisation ───────────────────────────────────────────────────
// Converts local Nigerian format (080..., 090...) to international (234...)
// Also handles numbers already in international format
function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "234" + digits.slice(1); // 080... → 23480...
  }
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("+")) return digits.slice(1);
  return digits; // pass through anything else
}

// ── WhatsApp button ───────────────────────────────────────────────────────
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

function WhatsAppButton({ phone, course, budget, description, role, loading }) {
  if (loading) {
    return (
      <div
        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold opacity-50 cursor-not-allowed"
        style={{ background: "#25d366", color: "#fff" }}
      >
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Loading contact…
      </div>
    );
  }

  const href = buildWhatsAppLink({ phone, course, budget, description, role });
  const hasPhone = Boolean(normalisePhone(phone));

  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
        style={{
          background: "#25d366",
          color: "#fff",
          boxShadow: "0 4px 14px rgba(37,211,102,0.25)",
        }}
      >
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {hasPhone ? "Contact via WhatsApp" : "Open WhatsApp"}
      </a>
      {!hasPhone && (
        <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
          The other user hasn't added a phone number yet — you can still send
          them a message.
        </p>
      )}
    </div>
  );
}

export default function WorkSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const { sessions, sessionsLoading, completeSession } = useSessions();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [otherPhone, setOtherPhone] = useState(null);
  const [myPhone, setMyPhone] = useState(null);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const session = sessions.find((s) => s.id === id);

  useEffect(() => {
    if (!sessionsLoading && !session) navigate("/dashboard", { replace: true });
  }, [sessionsLoading, session, navigate]);

  // Fetch the other user's phone from profiles
  useEffect(() => {
    if (!session || !user?.id) return;
    const otherId =
      user.id === session.ownerId ? session.helperId : session.ownerId;
    setProfilesLoading(true);
    Promise.all([
      supabase.from("profiles").select("phone").eq("id", otherId).single(),
      supabase.from("profiles").select("phone").eq("id", user.id).single(),
    ]).then(([{ data: otherData }, { data: myData }]) => {
      setOtherPhone(otherData?.phone ?? null);
      setMyPhone(myData?.phone ?? null);
      setProfilesLoading(false);
    });
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

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeSession(session.id);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--text-2)] hover:text-[var(--text-1)] text-sm transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-[var(--border)]">|</span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              isActive
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {isActive ? "Active Session" : "Completed"}
          </span>
          <span className="text-xs text-[var(--text-3)] ml-auto">
            You are the{" "}
            <span className="text-[var(--text-2)] font-medium">{role}</span>
          </span>
        </div>

        {/* Assignment card */}
        <div className="card rounded-2xl p-5 mb-4">
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
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card rounded-2xl p-4">
            <p className="text-xs text-[var(--text-3)] mb-1">Student (Owner)</p>
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
                : session.helperId.slice(0, 8) + "…"}
            </p>
          </div>
        </div>

        {/* Guidance + WhatsApp */}
        <div className="card rounded-2xl p-5 mb-4">
          {isOwner ? (
            <>
              <p className="text-sm font-medium text-[var(--text-1)] mb-1">
                Your helper has been accepted
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                Use WhatsApp to coordinate directly. Share your number or ask
                for theirs to get started fast.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--text-1)] mb-1">
                You're helping on this assignment
              </p>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                Reach out to the student via WhatsApp to coordinate. Mark as
                completed once you've finished.
              </p>
            </>
          )}
        </div>

        {/* No-phone banner — prompt current user to add their number */}
        {isActive && !profilesLoading && !myPhone && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-start gap-3"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <span className="text-amber-400 text-lg shrink-0">📱</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-400">
                Add your WhatsApp number
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
                Your match can't reach you via WhatsApp yet. Add your number in
                Settings so they can contact you.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="mt-2 text-xs font-semibold text-amber-400 underline underline-offset-2 cursor-pointer"
              >
                Go to Settings →
              </button>
            </div>
          </div>
        )}

        {/* WhatsApp button — shown while session is active */}
        {isActive && (isOwner || isHelper) && post && (
          <div className="mb-4">
            <WhatsAppButton
              phone={otherPhone}
              course={post.course}
              budget={post.budget}
              description={post.description}
              role={isOwner ? "owner" : "helper"}
              loading={profilesLoading}
            />
          </div>
        )}

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
    </DashboardLayout>
  );
}
