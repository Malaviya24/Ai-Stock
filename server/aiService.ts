export const AI_ENABLED = Boolean(process.env.AI_API_KEY);
const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

// System prompt embedded server-side (never sent from the client) per the
// financial-safety requirement: educational analysis only, plain language,
// no personalized advice, no guaranteed returns.
const SYSTEM_PROMPT = `You are an educational market-analysis assistant for retail beginners in India.
You are given signals from multiple systematic trading strategies plus indicator
data for NIFTY stocks. Produce a SHORT shortlist (max 6) of stocks that multiple
strategies or strong indicators currently favor. For each stock, output strictly:
symbol, companyName, action (BUY, WATCH, or AVOID), suggestedBuyZoneLow,
suggestedBuyZoneHigh, targetPrice, stopLoss, timeHorizon (e.g. "2-6 weeks"),
confidence (Low, Medium, or High), triggeringStrategies (array of strategy names),
and a "rationale" written in plain, jargon-free language a first-time investor
can understand (2-4 sentences explaining WHY, referencing the strategies/
indicators). Never guarantee returns. Never give personalized financial advice.
If the data is weak or thin, say so in the rationale and lower the confidence.
Respond with JSON only, matching the provided schema exactly.`;

export interface AdvisorPick {
  symbol: string;
  companyName: string;
  action: "BUY" | "WATCH" | "AVOID";
  suggestedBuyZoneLow: number;
  suggestedBuyZoneHigh: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: string;
  confidence: "Low" | "Medium" | "High";
  triggeringStrategies: string[];
  rationale: string;
}

// JSON Schema describing the exact shape we want back — enforced by Gemini's
// responseSchema (structured output), so we don't have to hand-parse prose.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          companyName: { type: "string" },
          action: { type: "string", enum: ["BUY", "WATCH", "AVOID"] },
          suggestedBuyZoneLow: { type: "number" },
          suggestedBuyZoneHigh: { type: "number" },
          targetPrice: { type: "number" },
          stopLoss: { type: "number" },
          timeHorizon: { type: "string" },
          confidence: { type: "string", enum: ["Low", "Medium", "High"] },
          triggeringStrategies: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
        },
        required: [
          "symbol", "companyName", "action", "suggestedBuyZoneLow",
          "suggestedBuyZoneHigh", "targetPrice", "stopLoss", "timeHorizon",
          "confidence", "triggeringStrategies", "rationale",
        ],
      },
    },
  },
  required: ["picks"],
};

export interface CandidateInput {
  symbol: string;
  companyName: string;
  price: number;
  strategiesFlagging: string[]; // e.g. ["Darvas Box", "RSI Ladder"]
  signal: string; // BUY / SELL / WATCH majority
  rsi?: number;
  dma124?: number;
  srtv?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  volumeRatio?: number;
}

/**
 * Sends a compact, pre-summarized set of candidates to the configured AI
 * provider and returns a structured shortlist. Never called from the client —
 * the API key stays server-side only.
 */
export async function generateAdvisorPicks(candidates: CandidateInput[]): Promise<AdvisorPick[]> {
  if (!AI_ENABLED) {
    throw new Error("AI Analyst is not configured (AI_API_KEY missing).");
  }

  const userPayload = {
    generatedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    candidates,
  };

  if (AI_PROVIDER === "gemini") {
    return callGemini(userPayload);
  }
  if (AI_PROVIDER === "groq") {
    return callGroq(userPayload);
  }
  if (AI_PROVIDER === "openai") {
    return callOpenAI(userPayload);
  }
  throw new Error(`Unknown AI_PROVIDER "${AI_PROVIDER}". Use gemini, groq, or openai.`);
}

async function callGemini(userPayload: unknown): Promise<AdvisorPick[]> {
  const apiKey = process.env.AI_API_KEY;
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(userPayload) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");

  const parsed = JSON.parse(text);
  return parsed.picks || [];
}

async function callGroq(userPayload: unknown): Promise<AdvisorPick[]> {
  const apiKey = process.env.AI_API_KEY;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nRespond with a JSON object: {"picks": [...]}` },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  const parsed = JSON.parse(text);
  return parsed.picks || [];
}

async function callOpenAI(userPayload: unknown): Promise<AdvisorPick[]> {
  const apiKey = process.env.AI_API_KEY;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nRespond with a JSON object: {"picks": [...]}` },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  const parsed = JSON.parse(text);
  return parsed.picks || [];
}
