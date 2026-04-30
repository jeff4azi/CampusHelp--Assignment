import { createContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { analytics } from "../utils/analytics.js";

export const SessionsContext = createContext(null);

const PLATFORM_FEE_PERCENT = 0.15;
const HELPER_SHARE_PERCENT = 1 - PLATFORM_FEE_PERCENT; // 85%

function mapSession(s) {
  return {
    id: s.id,
    postId: s.post_id,
    ownerId: s.owner_id,
    helperId: s.helper_id,
    status: s.status,
    paymentStatus: s.payment_status ?? "pending",
    amount: s.amount ?? null,
    platformFee: s.platform_fee ?? null,
    paymentReference: s.payment_reference ?? null,
    createdAt: s.created_at,
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

  async function createSession({
    postId,
    ownerId,
    helperId,
    paymentData = null,
  }) {
    const budget = paymentData?.amount ?? null;
    const platformFee = budget ? budget * PLATFORM_FEE_PERCENT : null;

    const { data, error } = await supabase
      .from("work_sessions")
      .insert({
        post_id: postId,
        owner_id: ownerId,
        helper_id: helperId,
        status: "active",
        payment_status: paymentData ? "paid" : "pending",
        amount: budget,
        platform_fee: platformFee,
        payment_reference: paymentData?.reference ?? null,
      })
      .select("*, posts(id, course, description, budget, status)")
      .single();

    if (error) throw error;

    if (paymentData && data) {
      await supabase.from("payments").insert({
        session_id: data.id,
        user_id: ownerId,
        helper_id: helperId,
        amount: budget,
        platform_fee: platformFee,
        withdrawable_amount: budget * HELPER_SHARE_PERCENT,
        transaction_reference: paymentData.reference,
        status: "success",
        withdrawal_status: "pending",
        metadata: paymentData.metadata ?? null,
      });
    }

    const session = mapSession(data);
    setSessions((prev) => [session, ...prev]);
    return session;
  }

  // ── FIXED: Atomic completion — updates session + post + payment ───────────
  async function completeSession(sessionId, userId, role) {
    // Try the atomic DB function first (requires migration 002 to be run)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "complete_session_atomic",
      {
        p_session_id: sessionId,
        p_user_id: userId,
      },
    );

    if (rpcError) {
      // Fallback: manual sequential updates if RPC not available
      console.warn(
        "RPC not available, falling back to sequential updates:",
        rpcError.message,
      );

      // 1. Get session to find post_id
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) throw new Error("Session not found");

      // 2. Update session status
      const { error: sessionErr } = await supabase
        .from("work_sessions")
        .update({ status: "completed" })
        .eq("id", sessionId);
      if (sessionErr) throw sessionErr;

      // 3. Update post status to completed
      const { error: postErr } = await supabase
        .from("posts")
        .update({ status: "completed" })
        .eq("id", session.postId);
      if (postErr) console.error("Post status update failed:", postErr);

      // 4. Update payment to available_for_withdrawal
      const helperShare = session.amount
        ? session.amount * HELPER_SHARE_PERCENT
        : null;
      if (helperShare) {
        await supabase
          .from("payments")
          .update({
            status: "available_for_withdrawal",
            withdrawable_amount: helperShare,
            helper_id: session.helperId,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId);
      }
    }

    // Update local state — session completed + post completed
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: "completed",
              post: s.post ? { ...s.post, status: "completed" } : s.post,
            }
          : s,
      ),
    );

    analytics.sessionCompleted(userId, sessionId, role);
  }

  return (
    <SessionsContext.Provider
      value={{
        sessions,
        setSessions,
        sessionsLoading,
        fetchSessions,
        createSession,
        completeSession,
        PLATFORM_FEE_PERCENT,
        HELPER_SHARE_PERCENT,
      }}
    >
      {children}
    </SessionsContext.Provider>
  );
}
