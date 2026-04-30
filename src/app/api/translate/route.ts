import { NextRequest } from "next/server";
import { buildTranslationPrompt } from "@/lib/prompts";

function parseApiError(raw: string): string {
  // Quota / billing
  if (raw.includes("insufficient_quota") || raw.includes("exceeded your current quota")) {
    return "API 사용량 초과입니다. OpenAI 결제 정보를 확인해주세요. (platform.openai.com/account/billing)";
  }
  // Invalid key
  if (raw.includes("invalid_api_key") || raw.includes("Incorrect API key")) {
    return "API 키가 올바르지 않습니다. 키를 다시 확인해주세요.";
  }
  // Rate limit
  if (raw.includes("rate_limit") || raw.includes("Rate limit")) {
    return "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.";
  }
  // Model not found
  if (raw.includes("model_not_found") || raw.includes("does not exist")) {
    return "모델을 찾을 수 없습니다. AI 설정을 확인해주세요.";
  }
  // Anthropic auth
  if (raw.includes("authentication_error") || raw.includes("invalid x-api-key")) {
    return "Claude API 키가 올바르지 않습니다. 키를 다시 확인해주세요.";
  }
  // Gemini
  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid")) {
    return "Gemini API 키가 올바르지 않습니다. Google AI Studio에서 키를 확인해주세요.";
  }
  // Content too long
  if (raw.includes("context_length") || raw.includes("maximum context length")) {
    return "텍스트가 너무 깁니다. 페이지를 나눠서 번역해주세요.";
  }
  // Generic
  if (raw.length > 200) {
    return "AI API 오류가 발생했습니다. API 키와 결제 상태를 확인해주세요.";
  }
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, provider, apiKey, glossary } = body;

    if (!text || !provider || !apiKey) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const prompt = buildTranslationPrompt(text, glossary || {});

    if (provider === "gemini") {
      return await callGemini(apiKey, prompt);
    } else if (provider === "claude") {
      return await callClaude(apiKey, prompt);
    } else if (provider === "gpt") {
      return await callGPT(apiKey, prompt);
    }

    return Response.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    console.error("Translate API error:", err);
    const raw = err instanceof Error ? err.message : "Translation failed";
    return Response.json({ error: parseApiError(raw) }, { status: 500 });
  }
}

async function callGemini(apiKey: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Response.json({
    translation: data.candidates?.[0]?.content?.parts?.[0]?.text || "번역 실패",
  });
}

async function callClaude(apiKey: string, prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Response.json({
    translation: data.content?.[0]?.text || "번역 실패",
  });
}

async function callGPT(apiKey: string, prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Response.json({
    translation: data.choices?.[0]?.message?.content || "번역 실패",
  });
}
