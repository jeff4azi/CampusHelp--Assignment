import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";

export const NotificationsContext = createContext(null);

function mapNotif(n) {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    refId: n.ref_id,
    createdAt: n.created_at,
  };
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserId = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    currentUserId.current = userId;
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setNotifications(data.map(mapNotif));
    setLoading(false);
  }, []);

  // Realtime subscription — called once user is known
  const subscribeRealtime = useCallback((userId) => {
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [mapNotif(payload.new), ...prev]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function markAllRead() {
    const userId = currentUserId.current;
    if (!userId) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  // Helper used by PostsContext to create notifications
  async function createNotification({ userId, type, title, body, refId }) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      ref_id: refId ?? null,
    });
    // Realtime will push it to the recipient if they're online
  }

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        subscribeRealtime,
        markRead,
        markAllRead,
        createNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
