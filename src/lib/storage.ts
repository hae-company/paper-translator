export type AIProvider = "gemini" | "claude" | "gpt";

const KEYS = {
  gemini: "pt_gemini_key",
  claude: "pt_claude_key",
  gpt: "pt_gpt_key",
  provider: "pt_provider",
  glossary: "pt_glossary",
  darkMode: "pt_dark",
} as const;

export function getApiKey(provider: AIProvider): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEYS[provider]) || "";
}

export function setApiKey(provider: AIProvider, key: string) {
  localStorage.setItem(KEYS[provider], key);
}

export function getProvider(): AIProvider {
  if (typeof window === "undefined") return "gemini";
  return (localStorage.getItem(KEYS.provider) as AIProvider) || "gemini";
}

export function setProvider(p: AIProvider) {
  localStorage.setItem(KEYS.provider, p);
}

export function getGlossary(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.glossary) || "{}");
  } catch {
    return {};
  }
}

export function setGlossary(g: Record<string, string>) {
  localStorage.setItem(KEYS.glossary, JSON.stringify(g));
}

export function getDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.darkMode) === "true";
}

export function setDarkMode(v: boolean) {
  localStorage.setItem(KEYS.darkMode, String(v));
}
