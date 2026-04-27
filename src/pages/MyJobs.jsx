import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { useSessions } from "../hooks/useSessions.js";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import PostCard from "../components/PostCard.jsx";
import CreatePostModal from "../components/CreatePostModal.jsx";
import { PlusIcon, BriefcaseIcon } from "../components/Icons.jsx";

export default function MyJobs() {
  const { user } = useAuth();
  const { posts, postsLoading } = usePosts();
  const { sessions } = useSessions();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const myPosts = posts
    .filter((p) => p.userId === user?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function sessionForPost(postId) {
    return sessions.find((s) => s.postId === postId && s.status === "active");
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              Assignments you posted
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Post a Job</span>
            <span className="sm:hidden">Post</span>
          </button>
        </div>

        {postsLoading ? (
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-3)" }}
          >
            Loading…
          </p>
        ) : myPosts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <BriefcaseIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-1)" }}
            >
              No requests yet
            </h2>
            <p
              className="text-sm mb-6 max-w-xs"
              style={{ color: "var(--text-2)" }}
            >
              Post your first assignment request and get matched with a helper
              fast.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
            >
              <PlusIcon className="w-4 h-4" />
              Create your first request
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {myPosts.map((post) => {
              const session = sessionForPost(post.id);
              return (
                <div key={post.id}>
                  <PostCard post={post} />
                  {session && (
                    <button
                      onClick={() => navigate(`/session/${session.id}`)}
                      className="mt-2 w-full text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 rounded-xl py-2.5 transition-colors cursor-pointer font-medium"
                    >
                      → Open Active Work Session
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}
