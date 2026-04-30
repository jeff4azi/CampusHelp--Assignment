import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { useSessions } from "../hooks/useSessions.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import ReviewModal from "../components/ReviewModal.jsx";
import { supabase } from "../lib/supabase.js";

function StarDisplay({ rating, size = "sm" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={sz}
          viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? "#fbbf24" : "none"}
          stroke={s <= Math.round(rating) ? "#fbbf24" : "var(--text-3)"}
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  );
}

export default function Completed() {
  const { user } = useAuth();
  const { sessions, sessionsLoading } = useSessions();
  const [reviewModal, setReviewModal] = useState(null); // { session, revieweeId, revieweeName }
  const [myReviews, setMyReviews] = useState({}); // sessionId → review

  const completedSessions = sessions.filter(
    (s) =>
      s.status === "completed" &&
      (s.ownerId === user?.id || s.helperId === user?.id),
  );

  // Load reviews the current user has already submitted
  useEffect(() => {
    if (!user?.id || completedSessions.length === 0) return;
    const sessionIds = completedSessions.map((s) => s.id);
    supabase
      .from("reviews")
      .select("session_id, rating, comment")
      .eq("reviewer_id", user.id)
      .in("session_id", sessionIds)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach((r) => {
            map[r.session_id] = r;
          });
          setMyReviews(map);
        }
      });
  }, [user?.id, completedSessions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function openReview(session) {
    const isOwner = session.ownerId === user?.id;
    const revieweeId = isOwner ? session.helperId : session.ownerId;
    const revieweeName = isOwner ? "the helper" : "the student";
    setReviewModal({ session, revieweeId, revieweeName });
  }

  return (
    <DashboardLayout>
      <div className="px-6 pt-6">
        <div className="mb-6">
          <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
            Finished work sessions
          </p>
        </div>

        {sessionsLoading ? (
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-3)" }}
          >
            Loading…
          </p>
        ) : completedSessions.length === 0 ? (
          <div
            className="text-center py-16 text-sm"
            style={{ color: "var(--text-3)" }}
          >
            No completed sessions yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {completedSessions.map((session) => {
              const post = session.post;
              const isOwner = session.ownerId === user?.id;
              const role = isOwner ? "Owner" : "Helper";
              const alreadyReviewed = Boolean(myReviews[session.id]);

              return (
                <div key={session.id} className="card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        color: "#818cf8",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      {post?.course ?? "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-3)" }}
                      >
                        {role}
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          color: "#34d399",
                          border: "1px solid rgba(52,211,153,0.2)",
                        }}
                      >
                        Completed
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-sm leading-relaxed line-clamp-2 mb-3"
                    style={{ color: "var(--text-1)" }}
                  >
                    {post?.description ?? "—"}
                  </p>

                  <div className="flex justify-between items-center mb-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#34d399" }}
                    >
                      {post ? formatCurrency(post.budget) : "—"}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-3)" }}
                    >
                      {formatRelativeTime(session.createdAt)}
                    </span>
                  </div>

                  {/* Review section */}
                  <div
                    className="pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {alreadyReviewed ? (
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={myReviews[session.id].rating} />
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-3)" }}
                        >
                          Your review
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => openReview(session)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        style={{
                          background: "rgba(251,191,36,0.1)",
                          border: "1px solid rgba(251,191,36,0.2)",
                          color: "#fbbf24",
                        }}
                      >
                        ⭐ Leave a review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewModal && (
        <ReviewModal
          session={reviewModal.session}
          revieweeId={reviewModal.revieweeId}
          revieweeName={reviewModal.revieweeName}
          onClose={() => setReviewModal(null)}
          onSubmitted={() => {
            // Refresh reviews map
            setMyReviews((prev) => ({
              ...prev,
              [reviewModal.session.id]: { rating: 1 }, // placeholder until refetch
            }));
          }}
        />
      )}
    </DashboardLayout>
  );
}
