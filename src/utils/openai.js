import { isOnTopic } from "./aiScoping.js";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ── Improve description ───────────────────────────────────────────────────
/**
 * Takes a raw description + course name and returns a cleaner, more detailed
 * version. Uses OpenAI if a key is present, otherwise falls back to a
 * rule-based rewrite.
 *
 * @param {string} description
 * @param {string} course
 * @returns {Promise<string>}
 */
export async function improveDescription(description, course) {
  const trimmed = description.trim();
  if (!trimmed) return trimmed;

  const hasKey =
    OPENAI_API_KEY && OPENAI_API_KEY !== "your-openai-api-key-here";

  if (hasKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a writing assistant for a campus assignment marketplace. " +
                "Rewrite the student's assignment request to be clearer, more detailed, and structured. " +
                "Include: what help is needed, any deadline if mentioned, subject context, and a sense of urgency if appropriate. " +
                "Keep it concise (2-4 sentences max). Return ONLY the improved text, no preamble.",
            },
            {
              role: "user",
              content: `Course: ${course || "Not specified"}\nDescription: ${trimmed}`,
            },
          ],
          max_tokens: 200,
          temperature: 0.5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const improved = data.choices?.[0]?.message?.content?.trim();
        if (improved) return improved;
      }
    } catch {
      // fall through to rule-based
    }
  }

  // ── Rule-based fallback ───────────────────────────────────────────────
  return ruleBasedImprove(trimmed, course);
}

function ruleBasedImprove(text, course) {
  const lower = text.toLowerCase();

  // Extract deadline if mentioned
  const deadlineMatch = text.match(
    /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(hour|day|week)s?)\b/i,
  );
  const deadline = deadlineMatch ? deadlineMatch[0] : null;

  // Detect subject hints
  const isCode =
    /\b(code|program|function|algorithm|bug|error|python|java|javascript|c\+\+|sql)\b/i.test(
      text,
    );
  const isMath =
    /\b(equation|calculus|algebra|matrix|integral|derivative|proof|theorem)\b/i.test(
      text,
    );
  const isEssay =
    /\b(essay|write|writing|paragraph|thesis|argument|topic)\b/i.test(text);
  const isExam = /\b(exam|test|quiz|midterm|final)\b/i.test(text);

  let improved = text.trim();

  // Capitalise first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);

  // Ensure ends with period
  if (!/[.!?]$/.test(improved)) improved += ".";

  // Add subject context if course is known and not already in text
  const courseHint =
    course && !lower.includes(course.toLowerCase())
      ? ` This is for my ${course} course.`
      : "";

  // Add type-specific detail
  let detail = "";
  if (isCode) detail = " I need help understanding and fixing the code.";
  else if (isMath) detail = " I need step-by-step explanation and solution.";
  else if (isEssay)
    detail = " I need help structuring and writing the content.";
  else if (isExam)
    detail = " I need help preparing and reviewing the material.";

  // Add urgency if deadline found
  const urgency = deadline
    ? ` Deadline: ${deadline} — urgent response needed.`
    : " Please respond as soon as possible.";

  return `${improved}${courseHint}${detail}${urgency}`.trim();
}

const OFF_TOPIC_RESPONSE =
  "I'm here to help with academic topics and platform usage. Try asking me about your assignments, how to write a good request, or how to use the marketplace.";

/**
 * Sends a message to OpenAI and returns the assistant reply.
 * Falls back to the local rule-based response if the API key is missing
 * or the message is off-topic.
 *
 * @param {string} userId
 * @param {string} message
 * @param {Array}  userPosts  - the current user's posts for context
 * @param {Array}  history    - previous messages [{role, text}]
 * @returns {Promise<string>}
 */
export async function sendMessageToAI(
  userId,
  message,
  userPosts = [],
  history = [],
) {
  if (!isOnTopic(message)) return OFF_TOPIC_RESPONSE;

  if (!OPENAI_API_KEY) {
    // No key — fall back to local responses
    const { generateResponse } = await import("./aiResponses.js");
    return generateResponse(message, userPosts);
  }

  const systemPrompt = buildSystemPrompt(userPosts);

  const messages = [
    { role: "system", content: systemPrompt },
    // Include last 10 messages for context
    ...history.slice(-10).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("OpenAI error:", err);
      const { generateResponse } = await import("./aiResponses.js");
      return generateResponse(message, userPosts);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? OFF_TOPIC_RESPONSE;
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    const { generateResponse } = await import("./aiResponses.js");
    return generateResponse(message, userPosts);
  }
}

function buildSystemPrompt(userPosts) {
  const postSummary =
    userPosts.length > 0
      ? `The user has ${userPosts.length} assignment request(s) on the platform:\n` +
        userPosts
          .map((p) => `- ${p.course}: "${p.description}" (budget $${p.budget})`)
          .join("\n")
      : "The user has no posts yet.";

  return `You are an academic assistant for CampusHelp, a campus assignment marketplace.
Your role is strictly limited to:
1. Helping students understand academic topics and concepts
2. Advising on how to write better assignment requests
3. Guiding users on how to use the CampusHelp platform
4. Providing study tips and deadline management advice

Do NOT answer questions unrelated to academics or the platform.
Be concise, friendly, and helpful.

${postSummary}`;
}
