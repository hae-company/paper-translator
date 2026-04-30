import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { text, provider, apiKey, glossary } = await req.json();

  if (!text || !provider || !apiKey) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
    });
  }

  const { buildTranslationPrompt } = await import("@/lib/prompts");
  const prompt = buildTranslationPrompt(text, glossary || {});

  try {
    if (provider === "gemini") {
      return await callGemini(apiKey, prompt);
    } else if (provider === "claude") {
      return await callClaude(apiKey, prompt);
    } else if (provider === "gpt") {
      return await callGPT(apiKey, prompt);
    }
    return new Response(JSON.stringify({ error: "Unknown provider" }), {
      status: 400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

async function callGemini(apiKey: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "번역 실패";

  return new Response(JSON.stringify({ translation: text }), {
    headers: { "Content-Type": "application/json" },
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await res.json();
  const text =
    data.content?.[0]?.text || "번역 실패";

  return new Response(JSON.stringify({ translation: text }), {
    headers: { "Content-Type": "application/json" },
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT API error: ${err}`);
  }

  const data = await res.json();
  const text =
    data.choices?.[0]?.message?.content || "번역 실패";

  return new Response(JSON.stringify({ translation: text }), {
    headers: { "Content-Type": "application/json" },
  });
}
