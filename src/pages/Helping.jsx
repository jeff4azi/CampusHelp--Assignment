import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";

export default function Helping() {
  const { user } = useAuth();
  const { sessions, sessionsLoading } = useSessions();
  const navigate = useNavigate();

  const helpingSessions = sessions.filter(
    (s) => s.helperId === user?.id && s.status === "active",
  );

  return (
    <DashboardLayout>
      <div className="px-6 pt-6">
        <div className="mb-6">
          <p className="text-xs text-[var(--text-2)] mt-0.5">
            Active sessions where you are the helper
          </p>
        </div>

        {sessionsLoading ? (
          <p className="text-[var(--text-3)] text-sm animate-pulse">Loading…</p>
        ) : helpingSessions.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-3)] text-sm">
            You're not helping on any active jobs yet.{" "}
            <span
              className="text-indigo-400 cursor-pointer hover:underline"
              onClick={() => navigate("/marketplace")}
            >
              Browse the marketplace
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {helpingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => navigate(`/session/${session.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SessionCard({ session, onClick }) {
  const post = session.post;
  return (
    <div
      onClick={onClick}
      className="card rounded-2xl p-5 cursor-pointer hover:border-indigo-500/40 transition-colors card-hover"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
          {post?.course ?? "—"}
        </span>
        <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
          Active
        </span>
      </div>
      <p className="text-sm text-[var(--text-1)] leading-relaxed line-clamp-2">
        {post?.description ?? "—"}
      </p>
      <div className="flex justify-between items-center mt-3">
        <span className="text-emerald-400 text-sm font-semibold">
          {post ? formatCurrency(post.budget) : "—"}
        </span>
        <span className="text-xs text-[var(--text-3)]">
          {formatRelativeTime(session.createdAt)}
        </span>
      </div>
    </div>
  );
}
