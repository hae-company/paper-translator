import { NextRequest } from "next/server";
import { buildTranslationPrompt } from "@/lib/prompts";

function parseApiError(raw: string, provider: string): string {
  const p = provider.toUpperCase() || "AI";
  const lower = raw.toLowerCase();

  // Provider-specific key errors
  if (provider === "gemini" && (lower.includes("api_key_invalid") || lower.includes("api key not valid"))) {
    return "Gemini API 키가 올바르지 않습니다. Google AI Studio에서 키를 확인해주세요.";
  }
  if (provider === "gpt" && (lower.includes("invalid_api_key") || lower.includes("incorrect api key"))) {
    return "GPT API 키가 올바르지 않습니다. 키를 다시 확인해주세요.";
  }
  if (provider === "claude" && (lower.includes("authentication_error") || lower.includes("invalid x-api-key"))) {
    return "Claude API 키가 올바르지 않습니다. 키를 다시 확인해주세요.";
  }

  // Quota / billing — provider-aware
  if (lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("billing") || lower.includes("insufficient")) {
    if (provider === "gemini") return "Gemini API 호출 한도가 초과되었습니다. 잠시 후 다시 시도하거나 Google AI Studio에서 할당량을 확인해주세요.";
    if (provider === "gpt") return "GPT API 사용량이 초과되었습니다. platform.openai.com 에서 결제 정보를 확인해주세요.";
    if (provider === "claude") return "Claude API 사용량이 초과되었습니다. Anthropic Console에서 확인해주세요.";
    return `${p} API 사용량이 초과되었습니다.`;
  }

  // Rate limit
  if (lower.includes("rate_limit") || lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return `${p} 요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.`;
  }

  // Content too long
  if (lower.includes("context_length") || lower.includes("maximum") || lower.includes("too long") || lower.includes("too large")) {
    return "텍스트가 너무 깁니다. 페이지를 나눠서 번역해주세요.";
  }

  // Permission
  if (lower.includes("permission") || lower.includes("forbidden") || lower.includes("403")) {
    return `${p} API 접근 권한이 없습니다. API 키 권한을 확인해주세요.`;
  }

  // Generic fallback
  if (raw.length > 200) {
    return `${p} API 오류가 발생했습니다. API 키와 설정을 확인해주세요.`;
  }
  return `${p} 오류: ${raw}`;
}

export async function POST(req: NextRequest) {
  let provider = "";
  try {
    const body = await req.json();
    const { text, apiKey, glossary } = body;
    provider = body.provider || "";

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
    console.error("Raw API error:", raw);
    return Response.json({ error: parseApiError(raw, provider), raw: raw.slice(0, 500) }, { status: 500 });
  }
}

// Free tier models ordered from lightest to heaviest
const GEMINI_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

async function callGemini(apiKey: string, prompt: string) {
  // Try each model — if one fails (503/429/quota), try the next
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (res.status === 503 || res.status === 429) {
        console.log(`Gemini ${model} ${res.status}, attempt ${attempt + 1}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (res.status === 404) {
        // Model not available, skip to next
        console.log(`Gemini ${model} not found, trying next`);
        break;
      }

      if (!res.ok) {
        const errText = await res.text();
        // Quota exhausted for this model — try next
        if (errText.includes("quota") || errText.includes("RESOURCE_EXHAUSTED")) {
          console.log(`Gemini ${model} quota exceeded, trying next`);
          break;
        }
        throw new Error(errText);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`Gemini translation success with model: ${model}`);
        return Response.json({ translation: text });
      }
    }
  }

  throw new Error("Gemini 모든 모델이 응답하지 않습니다. 잠시 후 다시 시도하거나 다른 AI를 선택해주세요.");
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
