import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters.js";
import AdminLayout from "../layouts/AdminLayout.jsx";
import toast from "react-hot-toast";

const STATUS_FILTERS = ["all", "open", "in_progress", "completed"];

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select(
        "id, course, description, budget, status, created_at, user_id, profiles(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(postId) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Failed to delete post.");
      return;
    }
    await supabase
      .rpc("log_admin_action", {
        p_action: "delete_post",
        p_target_type: "post",
        p_target_id: postId,
      })
      .catch(() => {});
    toast.success("Post deleted.");
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function handleUpdateStatus(postId, status) {
    const { error } = await supabase
      .from("posts")
      .update({ status })
      .eq("id", postId);
    if (error) {
      toast.error("Failed to update post.");
      return;
    }
    toast.success(`Post marked as ${status}.`);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status } : p)),
    );
  }

  const filtered = posts.filter((p) => {
    const matchSearch =
      !search ||
      (p.course || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.profiles?.full_name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const statusStyle = {
    open: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
    in_progress: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    completed: { bg: "rgba(99,102,241,0.1)", color: "#818cf8" },
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-[15px] font-bold"
              style={{ color: "var(--text-1)" }}
            >
              Posts / Jobs
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              {posts.length} total
            </p>
          </div>
          <button
            onClick={fetchPosts}
            className="text-[12px] px-3 py-1.5 rounded-lg cursor-pointer font-medium"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course, description, or student…"
            className="flex-1 min-w-48 rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer capitalize transition-all"
                style={{
                  background: filter === f ? "var(--accent)" : "transparent",
                  color: filter === f ? "#fff" : "var(--text-3)",
                }}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-14" />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-card)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {[
                      "Course",
                      "Description",
                      "Budget",
                      "Student",
                      "Status",
                      "Posted",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        style={{ color: "var(--text-3)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const ss = statusStyle[p.status] ?? {
                      bg: "var(--bg-hover)",
                      color: "var(--text-3)",
                    };
                    return (
                      <tr
                        key={p.id}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--bg-card)" : "var(--bg-raised)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td
                          className="px-4 py-3 font-semibold whitespace-nowrap"
                          style={{ color: "#818cf8" }}
                        >
                          {p.course}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p
                            className="truncate"
                            style={{ color: "var(--text-2)" }}
                          >
                            {p.description}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 font-semibold whitespace-nowrap"
                          style={{ color: "#34d399" }}
                        >
                          {formatCurrency(p.budget)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p style={{ color: "var(--text-1)" }}>
                            {p.profiles?.full_name || "—"}
                          </p>
                          <p style={{ color: "var(--text-3)" }}>
                            {p.profiles?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                            style={{ background: ss.bg, color: ss.color }}
                          >
                            {p.status.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatRelativeTime(p.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {p.status === "open" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(p.id, "completed")
                                }
                                className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-medium"
                                style={{
                                  background: "rgba(99,102,241,0.1)",
                                  color: "#818cf8",
                                  border: "1px solid rgba(99,102,241,0.2)",
                                }}
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-[11px] px-2 py-1 rounded-lg cursor-pointer font-medium"
                              style={{
                                background: "rgba(248,113,113,0.1)",
                                color: "#f87171",
                                border: "1px solid rgba(248,113,113,0.2)",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--text-3)" }}
              >
                No posts found.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
