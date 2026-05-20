// ── AI Matching Engine ────────────────────────────────────────────────────
// Scores helpers against a post using reputation data.
// No external API needed — pure client-side scoring.

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Score a single helper profile against a post.
 * Returns a score 0–100 and a list of match reasons.
 *
 * @param {object} profile  - helper's profile row
 * @param {object} post     - post object { course, description, budget }
 * @returns {{ score: number, reasons: string[], grade: string }}
 */
export function scoreHelper(profile, post) {
  let score = 0;
  const reasons = [];

  // ── 1. Rating (0–30 pts) ──────────────────────────────────────────────
  const rating = Number(profile.rating) || 0;
  if (rating >= 4.8) {
    score += 30;
    reasons.push("⭐ Exceptional rating");
  } else if (rating >= 4.5) {
    score += 24;
    reasons.push("⭐ Highly rated");
  } else if (rating >= 4.0) {
    score += 18;
    reasons.push("⭐ Well rated");
  } else if (rating >= 3.5) {
    score += 10;
  } else if (rating > 0) {
    score += 5;
  }

  // ── 2. Completed jobs (0–20 pts) ──────────────────────────────────────
  const jobs = Number(profile.completed_jobs) || 0;
  if (jobs >= 50) {
    score += 20;
    reasons.push("🏆 50+ jobs completed");
  } else if (jobs >= 20) {
    score += 16;
    reasons.push(`✅ ${jobs} jobs completed`);
  } else if (jobs >= 5) {
    score += 10;
    reasons.push(`✅ ${jobs} jobs completed`);
  } else if (jobs >= 1) {
    score += 5;
  }

  // ── 3. Completion rate (0–20 pts) ─────────────────────────────────────
  const rate = Number(profile.completion_rate) || 0;
  if (rate === 100) {
    score += 20;
    reasons.push("💯 100% completion rate");
  } else if (rate >= 90) {
    score += 16;
    reasons.push(`💯 ${Math.round(rate)}% completion rate`);
  } else if (rate >= 75) {
    score += 10;
  } else if (rate >= 50) {
    score += 5;
  }

  // ── 4. Skill match (0–20 pts) ─────────────────────────────────────────
  const skills = (profile.skills || []).map((s) => s.toLowerCase());
  const postText = `${post.course} ${post.description}`.toLowerCase();

  const matchedSkills = skills.filter((skill) => postText.includes(skill));
  if (matchedSkills.length >= 3) {
    score += 20;
    reasons.push(`🎯 Skills match: ${matchedSkills.slice(0, 3).join(", ")}`);
  } else if (matchedSkills.length === 2) {
    score += 14;
    reasons.push(`🎯 Skills match: ${matchedSkills.join(", ")}`);
  } else if (matchedSkills.length === 1) {
    score += 8;
    reasons.push(`🎯 Skill match: ${matchedSkills[0]}`);
  }

  // ── 5. Response time (0–10 pts) ───────────────────────────────────────
  const responseTime = Number(profile.response_time_avg) || 0;
  if (responseTime > 0 && responseTime <= 30) {
    score += 10;
    reasons.push("⚡ Fast responder");
  } else if (responseTime > 0 && responseTime <= 60) {
    score += 6;
    reasons.push("⚡ Quick responder");
  }

  // ── 6. Trust score bonus (0–5 pts) ────────────────────────────────────
  const trust = Number(profile.trust_score) || 0;
  if (trust >= 80) {
    score += 5;
    reasons.push("🛡 High trust score");
  } else if (trust >= 60) {
    score += 3;
  }

  // ── 7. Verified badge bonus ───────────────────────────────────────────
  if (profile.is_verified) {
    score += 3;
    reasons.push("✓ Verified helper");
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Grade
  const grade =
    score >= 85
      ? "Excellent Match"
      : score >= 70
        ? "Strong Match"
        : score >= 50
          ? "Good Match"
          : score >= 30
            ? "Possible Match"
            : "New Helper";

  return { score, reasons: reasons.slice(0, 3), grade };
}

/**
 * Rank a list of helper profiles against a post.
 * Returns sorted array with score/reasons attached.
 *
 * @param {object[]} profiles
 * @param {object}   post
 * @param {number}   limit
 * @returns {Array<object & { _score: number, _reasons: string[], _grade: string }>}
 */
export function rankHelpers(profiles, post, limit = 3) {
  return profiles
    .map((p) => {
      const { score, reasons, grade } = scoreHelper(p, post);
      return { ...p, _score: score, _reasons: reasons, _grade: grade };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/**
 * Generate an AI-powered offer message for a helper applying to a post.
 * Falls back to a rule-based template if no API key.
 *
 * @param {object} post    - { course, description, budget }
 * @param {object} profile - { full_name, skills, completed_jobs, rating, bio }
 * @returns {Promise<string>}
 */
export async function generateOfferMessage(post, profile) {
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
                "You are writing a short, professional offer message for a student helper " +
                "applying to assist with an assignment on a campus marketplace. " +
                "Be confident, specific, and concise (3–4 sentences max). " +
                "Mention relevant skills or experience. Do NOT use generic phrases like 'I hope this message finds you well'. " +
                "Return ONLY the message text.",
            },
            {
              role: "user",
              content:
                `Post: ${post.course} — "${post.description}" (Budget: ₦${post.budget})\n` +
                `Helper: ${profile.full_name || "Helper"}, ` +
                `Skills: ${(profile.skills || []).join(", ") || "general"}, ` +
                `Completed jobs: ${profile.completed_jobs || 0}, ` +
                `Rating: ${profile.rating || "new"}, ` +
                `Bio: ${profile.bio || "none"}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.65,
        }),
      });

      // 429 = rate limited, fall through to rule-based
      if (res.ok) {
        const data = await res.json();
        const msg = data.choices?.[0]?.message?.content?.trim();
        if (msg) return msg;
      }
    } catch {
      // Network error — fall through to rule-based
    }
  }

  // ── Rule-based fallback ───────────────────────────────────────────────
  return buildRuleBasedOffer(post, profile);
}

function buildRuleBasedOffer(post, profile) {
  const name = profile.full_name?.split(" ")[0] || "I";
  const skills = profile.skills || [];
  const jobs = Number(profile.completed_jobs) || 0;
  const rating = Number(profile.rating) || 0;
  const course = post.course || "this subject";
  const desc = post.description || "";

  // Detect subject type
  const isCode =
    /\b(code|program|python|java|javascript|sql|algorithm|bug)\b/i.test(
      desc + course,
    );
  const isMath = /\b(math|calculus|algebra|equation|statistics|proof)\b/i.test(
    desc + course,
  );
  const isEssay = /\b(essay|write|thesis|argument|literature|history)\b/i.test(
    desc + course,
  );

  let expertise = "";
  if (isCode)
    expertise =
      "I have strong programming skills and can help debug and explain code clearly.";
  else if (isMath)
    expertise =
      "I'm comfortable with mathematical concepts and can walk you through solutions step by step.";
  else if (isEssay)
    expertise =
      "I have experience with academic writing and can help structure and improve your work.";
  else if (skills.length > 0)
    expertise = `My skills include ${skills.slice(0, 2).join(" and ")}, which are relevant here.`;
  else
    expertise = `I have experience with ${course} and can provide clear, detailed help.`;

  let credibility = "";
  if (jobs >= 10 && rating >= 4.5) {
    credibility = ` I've completed ${jobs} jobs with a ${rating.toFixed(1)} rating.`;
  } else if (jobs >= 5) {
    credibility = ` I've successfully helped ${jobs} students on this platform.`;
  } else if (jobs >= 1) {
    credibility = ` I've helped students with similar assignments before.`;
  }

  return `Hi! I'd love to help with your ${course} assignment.${credibility} ${expertise} I'm available to start right away and will keep you updated throughout. Let me know if you have any questions!`;
}

/**
 * AI budget suggestion based on course + description.
 * Returns a suggested budget range as a string.
 *
 * @param {string} course
 * @param {string} description
 * @returns {Promise<{ min: number, max: number, reason: string }>}
 */
export async function suggestBudget(course, description) {
  const text = `${course} ${description}`.toLowerCase();

  // Rule-based budget ranges (NGN)
  const isCode =
    /\b(code|program|python|java|javascript|sql|algorithm|project|app)\b/i.test(
      text,
    );
  const isMath =
    /\b(math|calculus|algebra|statistics|equation|proof|matrix)\b/i.test(text);
  const isEssay =
    /\b(essay|write|thesis|research|paper|report|literature)\b/i.test(text);
  const isExam = /\b(exam|test|quiz|midterm|final|revision|prepare)\b/i.test(
    text,
  );
  const isLong =
    description.length > 200 ||
    /\b(full|complete|entire|whole|project)\b/i.test(text);

  let min = 2000;
  let max = 5000;
  let reason = "Standard assignment help";

  if (isCode && isLong) {
    min = 8000;
    max = 20000;
    reason = "Complex programming project";
  } else if (isCode) {
    min = 4000;
    max = 10000;
    reason = "Programming/coding help";
  } else if (isMath && isLong) {
    min = 5000;
    max = 12000;
    reason = "Extended math work";
  } else if (isMath) {
    min = 2500;
    max = 6000;
    reason = "Math problem solving";
  } else if (isEssay && isLong) {
    min = 5000;
    max = 15000;
    reason = "Long-form writing/research";
  } else if (isEssay) {
    min = 3000;
    max = 8000;
    reason = "Essay/writing help";
  } else if (isExam) {
    min = 3000;
    max = 8000;
    reason = "Exam preparation";
  } else if (isLong) {
    min = 4000;
    max = 10000;
    reason = "Comprehensive assignment";
  }

  return { min, max, reason };
}
