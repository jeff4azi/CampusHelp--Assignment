import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";

export const ChatContext = createContext(null);

// ── Helpers ───────────────────────────────────────────────────────────────

function mapMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type ?? "text",
    fileUrl: row.file_url ?? null,
    fileName: row.file_name ?? null,
    fileSize: row.file_size ?? null,
    readBy: row.read_by ?? [],
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at ?? null,
    senderName: row.senderName ?? null,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────

export function ChatProvider({ children }) {
  const [messagesBySession, setMessagesBySession] = useState({});
  const [presence, setPresence] = useState({});
  const subscriptions = useRef({});
  const [loadingBySession, setLoadingBySession] = useState({});

  // ── Fetch sender name separately (no FK to profiles from chat_messages) ──
  async function fetchSenderName(senderId) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .maybeSingle();
    return data?.full_name ?? null;
  }

  // ── Fetch history for a session ────────────────────────────────────────
  const fetchMessages = useCallback(async (sessionId) => {
    setLoadingBySession((prev) => ({ ...prev, [sessionId]: true }));

    // Fetch messages WITHOUT the profiles join — avoids 400 from missing FK
    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        "id, session_id, sender_id, content, type, file_url, file_name, file_size, read_by, created_at, edited_at, deleted_at",
      )
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("fetchMessages error:", error);
      setLoadingBySession((prev) => ({ ...prev, [sessionId]: false }));
      throw error;
    }

    if (data) {
      // Fetch unique sender names in one batch
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const nameMap = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        profiles?.forEach((p) => {
          nameMap[p.id] = p.full_name;
        });
      }

      setMessagesBySession((prev) => ({
        ...prev,
        [sessionId]: data.map((row) =>
          mapMessage({ ...row, senderName: nameMap[row.sender_id] ?? null }),
        ),
      }));
    }

    setLoadingBySession((prev) => ({ ...prev, [sessionId]: false }));
  }, []);

  // ── Subscribe to a session's chat ──────────────────────────────────────
  const subscribeToSession = useCallback((sessionId) => {
    if (subscriptions.current[sessionId]) return;

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const row = payload.new;
          const senderName = await fetchSenderName(row.sender_id);
          const msg = mapMessage({ ...row, senderName });

          setMessagesBySession((prev) => {
            const existing = prev[sessionId] ?? [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [sessionId]: [...existing, msg] };
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = mapMessage(payload.new);
          setMessagesBySession((prev) => {
            const existing = prev[sessionId] ?? [];
            return {
              ...prev,
              [sessionId]: existing.map((m) =>
                m.id === updated.id ? { ...m, ...updated } : m,
              ),
            };
          });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(`Chat channel error for session ${sessionId}`);
        }
      });

    subscriptions.current[sessionId] = channel;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to presence — FIX: add .on() BEFORE .subscribe() ────────
  const subscribeToPresence = useCallback((userIds) => {
    if (!userIds?.length) return;

    // Remove existing presence channel before re-subscribing
    const existing = subscriptions.current["__presence__"];
    if (existing) {
      supabase.removeChannel(existing);
      delete subscriptions.current["__presence__"];
    }

    const channel = supabase
      .channel("presence:global")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          const row = payload.new ?? payload.old;
          if (!row || !userIds.includes(row.user_id)) return;
          setPresence((prev) => ({
            ...prev,
            [row.user_id]: {
              isOnline: row.is_online ?? false,
              lastSeen: row.last_seen,
            },
          }));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Presence channel error — presence tracking disabled");
        }
      });

    subscriptions.current["__presence__"] = channel;
  }, []);

  // ── Fetch initial presence for users ──────────────────────────────────
  const fetchPresence = useCallback(async (userIds) => {
    if (!userIds?.length) return;
    try {
      const { data } = await supabase
        .from("user_presence")
        .select("user_id, is_online, last_seen")
        .in("user_id", userIds);

      if (data) {
        const map = {};
        data.forEach((row) => {
          map[row.user_id] = {
            isOnline: row.is_online,
            lastSeen: row.last_seen,
          };
        });
        setPresence((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      // Presence is non-critical — swallow errors
      console.warn("fetchPresence error:", e);
    }
  }, []);

  // ── Set own presence ───────────────────────────────────────────────────
  const setOnline = useCallback(async (userId, isOnline) => {
    if (!userId) return;
    try {
      await supabase.rpc("upsert_presence", {
        p_user_id: userId,
        p_online: isOnline,
      });
    } catch (e) {
      // Non-critical
      console.warn("setOnline error:", e);
    }
  }, []);

  // ── Send a message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (sessionId, senderId, content) => {
    const trimmed = content?.trim();
    if (!trimmed || !sessionId || !senderId) return null;

    // Optimistic insert
    const tempId = crypto.randomUUID();
    const optimistic = {
      id: tempId,
      sessionId,
      senderId,
      content: trimmed,
      type: "text",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      readBy: [],
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      senderName: null,
      _optimistic: true,
    };

    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), optimistic],
    }));

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        content: trimmed,
        type: "text",
      })
      .select(
        "id, session_id, sender_id, content, type, file_url, file_name, file_size, read_by, created_at, edited_at, deleted_at",
      )
      .single();

    if (error) {
      // Roll back optimistic message
      setMessagesBySession((prev) => ({
        ...prev,
        [sessionId]: (prev[sessionId] ?? []).filter((m) => m.id !== tempId),
      }));
      throw error;
    }

    const real = mapMessage({ ...data, senderName: null });
    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).map((m) =>
        m.id === tempId ? real : m,
      ),
    }));

    return real;
  }, []);

  // ── Mark messages as read ──────────────────────────────────────────────
  const markRead = useCallback(async (sessionId, userId) => {
    if (!sessionId || !userId) return;
    try {
      await supabase.rpc("mark_messages_read", {
        p_session_id: sessionId,
        p_user_id: userId,
      });
      setMessagesBySession((prev) => {
        const msgs = prev[sessionId];
        if (!msgs) return prev;
        return {
          ...prev,
          [sessionId]: msgs.map((m) =>
            m.senderId !== userId && !m.readBy.includes(userId)
              ? { ...m, readBy: [...m.readBy, userId] }
              : m,
          ),
        };
      });
    } catch (e) {
      console.warn("markRead error:", e);
    }
  }, []);

  // ── Soft-delete a message ──────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId, sessionId) => {
    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    if (!error) {
      setMessagesBySession((prev) => ({
        ...prev,
        [sessionId]: (prev[sessionId] ?? []).filter((m) => m.id !== messageId),
      }));
    }
  }, []);

  // ── Unsubscribe from a session ─────────────────────────────────────────
  const unsubscribeFromSession = useCallback((sessionId) => {
    const channel = subscriptions.current[sessionId];
    if (channel) {
      supabase.removeChannel(channel);
      delete subscriptions.current[sessionId];
    }
  }, []);

  // ── Cleanup all subscriptions on unmount ──────────────────────────────
  useEffect(() => {
    const subs = subscriptions.current;
    return () => {
      Object.values(subs).forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  // ── Derived: unread count per session ─────────────────────────────────
  function getUnreadCount(sessionId, userId) {
    const msgs = messagesBySession[sessionId] ?? [];
    return msgs.filter(
      (m) => m.senderId !== userId && !m.readBy.includes(userId),
    ).length;
  }

  return (
    <ChatContext.Provider
      value={{
        messagesBySession,
        loadingBySession,
        presence,
        fetchMessages,
        subscribeToSession,
        unsubscribeFromSession,
        subscribeToPresence,
        fetchPresence,
        setOnline,
        sendMessage,
        markRead,
        deleteMessage,
        getUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
