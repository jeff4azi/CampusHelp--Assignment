import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { usePosts } from "../hooks/usePosts.js";
import { sendMessageToAI } from "../utils/openai.js";

export default function AIChat({ onClose }) {
  const { user } = useAuth();
  const { getSession, addMessage, posts } = usePosts();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  const messages = getSession(user.id);
  const userPosts = posts.filter((p) => p.userId === user.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg = { role: "user", text, id: crypto.randomUUID() };
    await addMessage(user.id, userMsg);
    setInput("");
    setThinking(true);

    try {
      const reply = await sendMessageToAI(user.id, text, userPosts, messages);
      const aiMsg = { role: "ai", text: reply, id: crypto.randomUUID() };
      await addMessage(user.id, aiMsg);
    } catch {
      const errMsg = {
        role: "ai",
        text: "Sorry, something went wrong. Please try again.",
        id: crypto.randomUUID(),
      };
      await addMessage(user.id, errMsg);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-sm font-medium text-gray-200">
            AI Assistant
          </span>
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 max-h-80">
        {messages.length === 0 && (
          <div className="text-center text-xs text-gray-600 mt-4">
            Ask me about assignments, budgets, study tips, or how to use the
            platform.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] text-sm px-3 py-2 rounded-xl leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-[var(--color-surface-overlay)] text-gray-200 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-surface-overlay)] text-gray-400 text-sm px-3 py-2 rounded-xl rounded-bl-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 px-3 py-3 border-t border-[var(--color-border)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          className="flex-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
