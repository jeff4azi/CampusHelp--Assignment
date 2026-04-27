import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { BellIcon, CheckCircleIcon } from "../components/Icons.jsx";
import { formatRelativeTime } from "../utils/formatters.js";

const TYPE_CONFIG = {
  new_post: { color: "bg-indigo-500/15 text-indigo-400", label: "New Job" },
  new_offer: { color: "bg-amber-500/15 text-amber-400", label: "New Offer" },
  offer_accepted: {
    color: "bg-emerald-500/15 text-emerald-400",
    label: "Accepted",
  },
};

export default function Notifications() {
  const { notifications, loading, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();

  const hasUnread = notifications.some((n) => !n.read);

  function handleClick(notif) {
    markRead(notif.id);
    if (notif.type === "new_post") navigate("/marketplace");
    else if (notif.type === "new_offer") navigate("/my-jobs");
    else if (notif.type === "offer_accepted" && notif.refId)
      navigate(`/session/${notif.refId}`);
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            Your recent activity alerts
          </p>

          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              disabled={!hasUnread}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: hasUnread
                  ? "rgba(99,102,241,0.1)"
                  : "var(--bg-hover)",
                border: `1px solid ${hasUnread ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
                color: hasUnread ? "#818cf8" : "var(--text-3)",
              }}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton rounded-2xl h-20" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
              }}
            >
              <BellIcon
                className="w-6 h-6"
                style={{ color: "var(--text-3)" }}
              />
            </div>
            <p
              className="text-[14px] font-medium"
              style={{ color: "var(--text-2)" }}
            >
              No notifications yet
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
              You'll be notified when jobs are posted or offers arrive.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.new_post;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className="relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:border-indigo-500/30"
                  style={{
                    background: notif.read
                      ? "var(--bg-card)"
                      : "rgba(99,102,241,0.05)",
                    border: `1px solid ${notif.read ? "var(--border)" : "rgba(99,102,241,0.2)"}`,
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-400" />
                  )}

                  {/* Icon */}
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}
                  >
                    {notif.type === "offer_accepted" ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <BellIcon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p
                      className="text-[13.5px] font-semibold"
                      style={{ color: "var(--text-1)" }}
                    >
                      {notif.title}
                    </p>
                    <p
                      className="text-[12px] mt-0.5 leading-relaxed"
                      style={{ color: "var(--text-2)" }}
                    >
                      {notif.body}
                    </p>
                    <p
                      className="text-[11px] mt-1.5"
                      style={{ color: "var(--text-3)" }}
                    >
                      {formatRelativeTime(notif.createdAt)}
                    </p>
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
