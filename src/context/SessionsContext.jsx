import { createContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

export const SessionsContext = createContext(null);

function mapSession(s) {
  return {
    id: s.id,
    postId: s.post_id,
    ownerId: s.owner_id,
    helperId: s.helper_id,
    status: s.status,
    createdAt: s.created_at,
    // joined post data if fetched with select
    post: s.posts
      ? {
          id: s.posts.id,
          course: s.posts.course,
          description: s.posts.description,
          budget: s.posts.budget,
          status: s.posts.status,
        }
      : null,
  };
}

export function SessionsProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = useCallback(async (userId) => {
    if (!userId) return;
    setSessionsLoading(true);

    const { data, error } = await supabase
      .from("work_sessions")
      .select("*, posts(id, course, description, budget, status)")
      .or(`owner_id.eq.${userId},helper_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!error && data) setSessions(data.map(mapSession));
    setSessionsLoading(false);
  }, []);

  async function createSession({ postId, ownerId, helperId }) {
    const { data, error } = await supabase
      .from("work_sessions")
      .insert({
        post_id: postId,
        owner_id: ownerId,
        helper_id: helperId,
        status: "active",
      })
      .select("*, posts(id, course, description, budget, status)")
      .single();

    if (error) throw error;

    const session = mapSession(data);
    setSessions((prev) => [session, ...prev]);
    return session;
  }

  async function completeSession(sessionId) {
    const { error } = await supabase
      .from("work_sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    if (error) throw error;

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: "completed" } : s)),
    );
  }

  return (
    <SessionsContext.Provider
      value={{
        sessions,
        sessionsLoading,
        fetchSessions,
        createSession,
        completeSession,
      }}
    >
      {children}
    </SessionsContext.Provider>
  );
}
