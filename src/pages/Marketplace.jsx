import { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import Feed from "../components/Feed.jsx";
import CreatePostModal from "../components/CreatePostModal.jsx";
import { PlusIcon } from "../components/Icons.jsx";

export default function Marketplace() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { posts } = usePosts();

  const openCount = posts.filter((p) => p.status === "open").length;
  const myOpenCount = posts.filter(
    (p) => p.userId === user?.id && p.status === "open",
  ).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              Browse open assignment requests
            </p>
            {/* Live activity hint */}
            {openCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">
                  {openCount} open {openCount === 1 ? "job" : "jobs"} right now
                </span>
                {myOpenCount > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>
                    · {myOpenCount} yours
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Post a Job</span>
            <span className="sm:hidden">Post</span>
          </button>
        </div>
      </div>

      <Feed />

      {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}
