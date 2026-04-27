import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";

export default function Completed() {
  const { user } = useAuth();
  const { sessions, sessionsLoading } = useSessions();

  const completedSessions = sessions.filter(
    (s) =>
      s.status === "completed" &&
      (s.ownerId === user?.id || s.helperId === user?.id),
  );

  return (
    <DashboardLayout>
      <div className="px-6 pt-6">
        <div className="mb-6">
          <p className="text-xs text-[var(--text-2)] mt-0.5">
            Finished work sessions
          </p>
        </div>

        {sessionsLoading ? (
          <p className="text-[var(--text-3)] text-sm animate-pulse">Loading…</p>
        ) : completedSessions.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-3)] text-sm">
            No completed sessions yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {completedSessions.map((session) => {
              const post = session.post;
              const role = session.ownerId === user?.id ? "Owner" : "Helper";
              return (
                <div key={session.id} className="card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                      {post?.course ?? "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-3)]">
                        {role}
                      </span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                        Completed
                      </span>
                    </div>
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
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
