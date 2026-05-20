import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "../hooks/useChat.js";
import { useAuth } from "../hooks/useAuth.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ── Online indicator ──────────────────────────────────────────────────────

function OnlineDot({ isOnline }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        isOnline ? "bg-emerald-400" : "bg-[var(--text-3)]"
      }`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}

// ── Read receipt tick ─────────────────────────────────────────────────────

function ReadTick({ readBy, otherUserId }) {
  const isRead = readBy?.includes(otherUserId);
  return (
    <span
      className={`text-[10px] leading-none ${isRead ? "text-indigo-400" : "text-[var(--text-3)]"}`}
      title={isRead ? "Seen" : "Sent"}
    >
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────

function MessageBubble({ msg, isMine, otherUserId, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div
      className={`flex items-end gap-1.5 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar placeholder */}
      {!isMine && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mb-0.5">
          {(msg.senderName ?? "?")[0].toUpperCase()}
        </div>
      )}

      <div
        className={`relative max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}
      >
        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-default select-text ${
            isMine
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "text-[var(--text-1)] rounded-bl-sm"
          }`}
          style={
            isMine
              ? { boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }
              : {
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }
          }
          onContextMenu={(e) => {
            if (isMine) {
              e.preventDefault();
              setShowMenu(true);
            }
          }}
        >
          {msg.content}
        </div>

        {/* Timestamp + read receipt */}
        <div
          className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
        >
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
            {formatTime(msg.createdAt)}
          </span>
          {msg._optimistic && (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              …
            </span>
          )}
          {isMine && !msg._optimistic && (
            <ReadTick readBy={msg.readBy} otherUserId={otherUserId} />
          )}
        </div>

        {/* Context menu (delete) */}
        {showMenu && isMine && (
          <div
            ref={menuRef}
            className="absolute bottom-full mb-1 right-0 z-20 rounded-xl overflow-hidden shadow-xl fade-in"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              minWidth: "120px",
            }}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete(msg.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── System message ────────────────────────────────────────────────────────

function SystemMessage({ content }) {
  return (
    <div className="flex justify-center my-1">
      <span
        className="text-[11px] px-3 py-1 rounded-full"
        style={{
          background: "var(--bg-hover)",
          color: "var(--text-3)",
          border: "1px solid var(--border)",
        }}
      >
        {content}
      </span>
    </div>
  );
}

// ── Date divider ──────────────────────────────────────────────────────────

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0" />
      <div
        className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ otherName }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
        }}
      >
        💬
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
          Start the conversation
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
          {otherName
            ? `Say hi to ${otherName} to get started`
            : "Send a message to get started"}
        </p>
      </div>
    </div>
  );
}

// ── Main SessionChat component ────────────────────────────────────────────

export default function SessionChat({
  sessionId,
  otherUserId,
  otherName,
  isSessionActive,
}) {
  const { user } = useAuth();
  const {
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
  } = useChat();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // other user typing (future)
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const messages = messagesBySession[sessionId] ?? [];
  const isLoading = loadingBySession[sessionId] ?? false;
  const otherPresence = presence[otherUserId] ?? { isOnline: false };

  // ── Mount: fetch history, subscribe, set online ──────────────────────
  useEffect(() => {
    if (!sessionId || !user?.id) return;

    fetchMessages(sessionId);
    subscribeToSession(sessionId);
    fetchPresence([user.id, otherUserId]);
    subscribeToPresence([user.id, otherUserId]);
    setOnline(user.id, true);

    // Mark existing messages as read
    markRead(sessionId, user.id);

    return () => {
      unsubscribeFromSession(sessionId);
      setOnline(user.id, false);
    };
  }, [sessionId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark read when new messages arrive ───────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      markRead(sessionId, user.id);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Send handler ──────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (e) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || sending || !isSessionActive) return;

      setInput("");
      setSending(true);
      try {
        await sendMessage(sessionId, user.id, text);
      } catch {
        // Restore input on failure
        setInput(text);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, sending, isSessionActive, sessionId, user?.id, sendMessage],
  );

  // ── Keyboard: Enter to send, Shift+Enter for newline ─────────────────
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────
  async function handleDelete(messageId) {
    await deleteMessage(messageId, sessionId);
  }

  // ── Render messages with date dividers ────────────────────────────────
  function renderMessages() {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-3 p-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div
                className="skeleton rounded-2xl"
                style={{
                  width: `${140 + i * 30}px`,
                  height: "36px",
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (messages.length === 0) {
      return <EmptyState otherName={otherName} />;
    }

    const items = [];
    messages.forEach((msg, idx) => {
      const prev = messages[idx - 1];
      // Date divider
      if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
        items.push(
          <DateDivider
            key={`divider-${msg.id}`}
            label={formatDateDivider(msg.createdAt)}
          />,
        );
      }

      if (msg.type === "system") {
        items.push(<SystemMessage key={msg.id} content={msg.content} />);
        return;
      }

      const isMine = msg.senderId === user?.id;
      items.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          isMine={isMine}
          otherUserId={otherUserId}
          onDelete={handleDelete}
        />,
      );
    });

    return items;
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        height: "480px",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
              {(otherName ?? "?")[0].toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                otherPresence.isOnline ? "bg-emerald-400" : "bg-[var(--text-3)]"
              }`}
              style={{ borderColor: "var(--bg-card)" }}
            />
          </div>
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              {otherName ?? "Your match"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {otherPresence.isOnline
                ? "Online now"
                : otherPresence.lastSeen
                  ? `Last seen ${formatTime(otherPresence.lastSeen)}`
                  : "Offline"}
            </p>
          </div>
        </div>

        {/* Live badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#818cf8",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {renderMessages()}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────── */}
      {isSessionActive ? (
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm leading-relaxed transition-colors"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              maxHeight: "120px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--border-focus)";
              e.target.style.boxShadow = "0 0 0 3px var(--ring)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
            // Auto-grow
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: input.trim() ? "var(--accent)" : "var(--bg-hover)",
              color: input.trim() ? "#fff" : "var(--text-3)",
              boxShadow: input.trim() ? "var(--shadow-btn)" : "none",
            }}
            title="Send message"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <div
          className="px-4 py-3 text-center text-xs shrink-0"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-3)",
          }}
        >
          This session is completed — chat is read-only
        </div>
      )}
    </div>
  );
}
