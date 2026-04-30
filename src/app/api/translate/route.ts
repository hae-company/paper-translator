import { NextRequest } from "next/server";
import { buildTranslationPrompt } from "@/lib/prompts";

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
    const message = err instanceof Error ? err.message : "Translation failed";
    return Response.json({ error: message }, { status: 500 });
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
  if (!res.ok) throw new Error(`Gemini: ${await res.text()}`);
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
  if (!res.ok) throw new Error(`Claude: ${await res.text()}`);
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
  if (!res.ok) throw new Error(`GPT: ${await res.text()}`);
  const data = await res.json();
  return Response.json({
    translation: data.choices?.[0]?.message?.content || "번역 실패",
  });
}
