import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePosts } from "../hooks/usePosts.js";
import { formatRelativeTime } from "../utils/formatters.js";
import PaymentModal from "./PaymentModal.jsx";
import HelperProfileModal from "./HelperProfileModal.jsx";
import { LevelBadge, StarRating, BadgeRow } from "./ReputationBadge.jsx";
import { supabase } from "../lib/supabase.js";
import toast from "react-hot-toast";

// ── Fetch helper profiles in one batch ────────────────────────────────────
async function fetchHelperProfiles(helperIds) {
  if (!helperIds.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, rating, total_reviews, level_name, completed_jobs, completion_rate, badges, trust_score",
    )
    .in("id", helperIds);
  const map = {};
  data?.forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

// ── Compact helper reputation strip ──────────────────────────────────────
function HelperRepStrip({ profile, onViewProfile }) {
  if (!profile) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          ?
        </div>
        <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Loading…
        </span>
      </div>
    );
  }

  const initials = (profile.full_name || "?")[0].toUpperCase();

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
      >
        {initials}
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--text-1)" }}
          >
            {profile.full_name || "Helper"}
          </span>
          <LevelBadge level={profile.level_name ?? "Newbie"} />
        </div>
        <div className="flex items-center gap-2">
          <StarRating
            rating={profile.rating ?? 0}
            count={profile.total_reviews}
          />
          {profile.completed_jobs > 0 && (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              {profile.completed_jobs} job
              {profile.completed_jobs !== 1 ? "s" : ""}
            </span>
          )}
          {profile.badges?.length > 0 && (
            <BadgeRow badges={profile.badges} max={2} />
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewProfile();
        }}
        className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-colors shrink-0"
        style={{
          background: "rgba(99,102,241,0.1)",
          color: "#818cf8",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        View Profile
      </button>
    </div>
  );
}

export default function OffersList({ post }) {
  const { offersByPost, fetchOffersForPost } = usePosts();
  const [paymentOffer, setPaymentOffer] = useState(null);
  const [profileModal, setProfileModal] = useState(null); // helperId
  const [helperProfiles, setHelperProfiles] = useState({});
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOffersForPost(post.id);
  }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const offers = offersByPost[post.id] ?? [];
  const isInProgress = post.status === "in_progress";

  // Fetch helper profiles whenever offers change
  useEffect(() => {
    const ids = offers.map((o) => o.helperId).filter(Boolean);
    if (!ids.length) return;
    fetchHelperProfiles(ids).then(setHelperProfiles);
  }, [offers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePaymentSuccess({ session_id }) {
    setPaymentOffer(null);
    setNavigating(true);
    toast.success("Session started! Redirecting…");
    navigate(`/session/${session_id}`);
  }

  if (offers.length === 0) {
    return (
      <p className="text-xs mt-3 italic" style={{ color: "var(--text-3)" }}>
        No offers yet.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-3">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-3)" }}
        >
          Offers ({offers.length})
        </p>

        {offers.map((offer) => {
          const profile = helperProfiles[offer.helperId];
          return (
            <div
              key={offer.id}
              className="rounded-xl p-3.5 flex flex-col gap-3"
              style={
                offer.accepted
                  ? {
                      background: "rgba(52,211,153,0.05)",
                      border: "1px solid rgba(52,211,153,0.2)",
                    }
                  : {
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {/* Helper reputation strip */}
              <HelperRepStrip
                profile={profile}
                onViewProfile={() => setProfileModal(offer.helperId)}
              />

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)" }} />

              {/* Offer message + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--text-1)" }}
                  >
                    {offer.message}
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: "var(--text-3)" }}
                  >
                    {formatRelativeTime(offer.createdAt)}
                  </p>
                </div>

                {offer.accepted ? (
                  <span className="shrink-0 text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                    ✓ Accepted
                  </span>
                ) : !isInProgress ? (
                  <button
                    onClick={() => setPaymentOffer(offer)}
                    disabled={navigating}
                    className="shrink-0 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    style={{
                      background: "var(--accent)",
                      boxShadow: "var(--shadow-btn)",
                    }}
                  >
                    Accept
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {paymentOffer && (
        <PaymentModal
          offer={paymentOffer}
          post={post}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentOffer(null)}
        />
      )}

      {profileModal && (
        <HelperProfileModal
          helperId={profileModal}
          onClose={() => setProfileModal(null)}
        />
      )}
    </>
  );
}
