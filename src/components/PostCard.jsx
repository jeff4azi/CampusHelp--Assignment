import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { formatCurrency, formatRelativeTime } from "../utils/formatters.js";
import { ClockIcon, CurrencyIcon, PlusIcon } from "./Icons.jsx";
import ApplyModal from "./ApplyModal.jsx";
import OffersList from "./OffersList.jsx";
import ReportModal from "./ReportModal.jsx";
import { supabase } from "../lib/supabase.js";

function isNew(createdAt) {
  return Date.now() - new Date(createdAt).getTime() < 2 * 60 * 60 * 1000;
}
function isUrgent(post) {
  const age = Date.now() - new Date(post.createdAt).getTime();
  return post.status === "open" && age > 30 * 60 * 1000;
}

function StarMini({ rating }) {
  if (!rating || rating === 0) return null;
  return (
    <span className="flex items-center gap-0.5">
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="#fbbf24"
        stroke="#fbbf24"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
      <span className="text-[11px] font-semibold" style={{ color: "#fbbf24" }}>
        {Number(rating).toFixed(1)}
      </span>
    </span>
  );
}

export default function PostCard({ post }) {
  const { user } = useAuth();
  const [showApply, setShowApply] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState(null);

  const isOwner = user?.id === post.userId;
  const isOpen = post.status === "open";
  const fresh = isNew(post.createdAt);
  const urgent = isUrgent(post);

  // Fetch post owner's rating
  useEffect(() => {
    if (!post.userId) return;
    supabase
      .from("profiles")
      .select("rating, total_reviews, full_name, skills")
      .eq("id", post.userId)
      .single()
      .then(({ data }) => {
        if (data) setOwnerProfile(data);
      });
  }, [post.userId]);

  return (
    <>
      <div
        className="card-hover group relative rounded-2xl p-5 transition-all"
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${isOpen && !isOwner ? "rgba(99,102,241,0.2)" : "var(--border)"}`,
          boxShadow:
            isOpen && !isOwner
              ? "0 0 0 1px rgba(99,102,241,0.08), var(--shadow-card)"
              : "var(--shadow-card)",
        }}
      >
        {isOpen && !isOwner && (
          <div
            className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)",
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap gap-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase"
              style={{
                background: "rgba(99,102,241,0.1)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              {post.course}
            </span>
            {fresh && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(52,211,153,0.1)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                New
              </span>
            )}
            {/* Owner rating badge */}
            {ownerProfile?.rating > 0 && (
              <StarMini rating={ownerProfile.rating} />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOpen ? (
              urgent ? (
                <span
                  className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.2)",
                  }}
                >
                  Urgent
                </span>
              ) : (
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    color: "#34d399",
                    border: "1px solid rgba(52,211,153,0.2)",
                  }}
                >
                  Open
                </span>
              )
            ) : post.status === "in_progress" ? (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{
                  background: "rgba(251,191,36,0.1)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}
              >
                In Progress
              </span>
            ) : (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-3)",
                  border: "1px solid var(--border)",
                }}
              >
                Completed
              </span>
            )}

            {/* Report button — only for non-owners */}
            {!isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport(true);
                }}
                title="Report this post"
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                style={{
                  color: "var(--text-3)",
                  background: "var(--bg-hover)",
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l1.664 9.776A2 2 0 006.64 14.5H17.5a2 2 0 001.976-1.724L20.5 6H6M3 3H1.5M3 3l.5 3"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Skills tags (from owner profile) */}
        {ownerProfile?.skills?.length > 0 && !isOwner && (
          <div className="flex flex-wrap gap-1 mb-3">
            {ownerProfile.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-3)",
                  border: "1px solid var(--border)",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p
          className="text-[13.5px] leading-relaxed line-clamp-3 mb-4"
          style={{ color: "var(--text-1)" }}
        >
          {post.description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs mb-4">
          <span
            className="flex items-center gap-1.5 font-bold text-[14px]"
            style={{ color: "#34d399" }}
          >
            <CurrencyIcon className="w-3.5 h-3.5" />
            {formatCurrency(post.budget)}
          </span>
          <span
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: "var(--text-3)" }}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {!isOwner && isOpen && (
            <button
              onClick={() => setShowApply(true)}
              className="flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all cursor-pointer flex-1 justify-center sm:flex-none sm:justify-start active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "var(--shadow-btn)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--accent-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--accent)")
              }
            >
              <PlusIcon className="w-4 h-4" />
              Apply to Help
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowOffers((v) => !v)}
              className="text-[12px] px-3.5 py-2 rounded-xl transition-all cursor-pointer font-semibold"
              style={{
                color: "var(--text-2)",
                border: "1px solid var(--border)",
                background: "var(--bg-hover)",
              }}
            >
              {showOffers ? "Hide Offers" : "View Offers"}
            </button>
          )}
          {!isOwner && !isOpen && (
            <span
              className="text-[12px] italic"
              style={{ color: "var(--text-3)" }}
            >
              No longer accepting offers
            </span>
          )}
        </div>

        {isOwner && showOffers && <OffersList post={post} />}
      </div>

      {showApply && (
        <ApplyModal post={post} onClose={() => setShowApply(false)} />
      )}
      {showReport && (
        <ReportModal
          type="post"
          targetId={post.id}
          targetName={`${post.course} post`}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
