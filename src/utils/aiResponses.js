import { isOnTopic } from "./aiScoping.js";

const OFF_TOPIC_RESPONSE =
  "I'm here to help with academic topics and platform usage. Try asking me about your assignments, how to write a good request, or how to use the marketplace.";

/**
 * Generates a response for the given message.
 * @param {string} message
 * @param {Array} userPosts - the current user's posts (optional)
 * @returns {string}
 */
export function generateResponse(message, userPosts = []) {
  if (!isOnTopic(message)) {
    return OFF_TOPIC_RESPONSE;
  }

  const lower = message.toLowerCase();

  // Pattern 1: How to write a good post / request description
  if (
    (lower.includes("write") &&
      (lower.includes("post") || lower.includes("request"))) ||
    lower.includes("good request") ||
    lower.includes("description") ||
    lower.includes("how to post")
  ) {
    const tip =
      "A great request includes: the course name, a clear description of what you need, your deadline, and a fair budget. ";
    if (userPosts && userPosts.length > 0) {
      return (
        tip +
        `Looking at your ${userPosts.length} existing post(s), make sure each one has enough detail so tutors know exactly what you need.`
      );
    }
    return (
      tip +
      "Try to be as specific as possible — tutors respond faster to detailed requests."
    );
  }

  // Pattern 2: Budget guidance
  if (
    lower.includes("budget") ||
    lower.includes("how much") ||
    lower.includes("price")
  ) {
    return (
      "Setting a fair budget helps attract quality tutors. For a typical assignment, $20–$50 is a common range. " +
      "For longer essays or complex projects, $50–$150 is reasonable. You can always negotiate in the comments."
    );
  }

  // Pattern 3: Platform features / how to use the marketplace
  if (
    lower.includes("marketplace") ||
    lower.includes("dashboard") ||
    lower.includes("how does") ||
    lower.includes("platform") ||
    lower.includes("feed") ||
    lower.includes("create") ||
    lower.includes("signup") ||
    lower.includes("login") ||
    lower.includes("account")
  ) {
    return (
      'Here\'s how the marketplace works: sign up for an account, then click "Create Request" on your dashboard to post an assignment. ' +
      "Tutors browse the feed and reach out to help. You can manage your posts from your profile."
    );
  }

  // Pattern 4: Deadline / time management
  if (
    lower.includes("deadline") ||
    lower.includes("due") ||
    lower.includes("time")
  ) {
    return (
      "Deadlines can be stressful! Post your request as early as possible to give tutors enough time to help. " +
      "Include your exact deadline in the description so tutors know if they can commit."
    );
  }

  // Pattern 5: Study tips / academic encouragement
  if (
    lower.includes("study") ||
    lower.includes("exam") ||
    lower.includes("grade") ||
    lower.includes("understand") ||
    lower.includes("concept") ||
    lower.includes("learn")
  ) {
    return (
      "Here are some study tips: break your material into small chunks, use active recall instead of re-reading, " +
      "and take short breaks every 25–30 minutes (Pomodoro technique). If a concept is tricky, posting a request here " +
      "can connect you with someone who can explain it clearly."
    );
  }

  // Pattern 6: Feedback / review requests
  if (
    lower.includes("feedback") ||
    lower.includes("review") ||
    lower.includes("improve")
  ) {
    return (
      "Getting feedback is one of the best ways to improve your work. When posting a review request, " +
      "attach your draft details in the description and specify what kind of feedback you're looking for — " +
      "structure, grammar, argument strength, or all of the above."
    );
  }

  // Pattern 7: Tutor / help requests
  if (
    lower.includes("tutor") ||
    lower.includes("help") ||
    lower.includes("explain") ||
    lower.includes("professor") ||
    lower.includes("lecture")
  ) {
    return (
      "Looking for help? Post a request on the marketplace with your course name and a clear description of what you need. " +
      "Tutors who specialize in your subject will be able to reach out and assist you."
    );
  }

  // Pattern 8: Programming / code / algorithm
  if (
    lower.includes("code") ||
    lower.includes("programming") ||
    lower.includes("algorithm") ||
    lower.includes("data") ||
    lower.includes("analysis")
  ) {
    return (
      "For coding or data assignments, be sure to include the programming language, the problem statement, " +
      "and any constraints or starter code in your request. The more context you provide, the better tutors can help."
    );
  }

  // Generic fallback for on-topic messages
  return (
    "I'm here to help! You can ask me how to write a great assignment request, tips for studying, " +
    "how to set a budget, or how to use the marketplace features."
  );
}
