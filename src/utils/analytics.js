import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (!POSTHOG_KEY || initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // manual control
    persistence: "localStorage",
  });
  initialized = true;
}

export function identifyUser(userId, traits = {}) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function track(event, properties = {}) {
  if (!initialized) return;
  posthog.capture(event, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

// ── Named event helpers ────────────────────────────────────────────────────

export const analytics = {
  userSignedUp: (userId, method = "email") =>
    track("user_signed_up", { user_id: userId, method }),

  userLoggedIn: (userId, method = "email") =>
    track("user_logged_in", { user_id: userId, method }),

  postCreated: (userId, postId, course, budget) =>
    track("post_created", { user_id: userId, post_id: postId, course, budget }),

  offerSubmitted: (userId, postId, offerId) =>
    track("offer_submitted", {
      user_id: userId,
      post_id: postId,
      offer_id: offerId,
    }),

  offerAccepted: (userId, postId, offerId, sessionId, budget) =>
    track("offer_accepted", {
      user_id: userId,
      post_id: postId,
      offer_id: offerId,
      session_id: sessionId,
      budget,
    }),

  paymentInitiated: (userId, sessionId, amount) =>
    track("payment_initiated", {
      user_id: userId,
      session_id: sessionId,
      amount,
    }),

  paymentCompleted: (userId, sessionId, amount, reference) =>
    track("payment_completed", {
      user_id: userId,
      session_id: sessionId,
      amount,
      reference,
    }),

  paymentFailed: (userId, sessionId, reason) =>
    track("payment_failed", { user_id: userId, session_id: sessionId, reason }),

  sessionCompleted: (userId, sessionId, role) =>
    track("session_completed", {
      user_id: userId,
      session_id: sessionId,
      role,
    }),

  reviewSubmitted: (userId, sessionId, rating) =>
    track("review_submitted", {
      user_id: userId,
      session_id: sessionId,
      rating,
    }),

  reportSubmitted: (userId, type, targetId) =>
    track("report_submitted", { user_id: userId, type, target_id: targetId }),
};
