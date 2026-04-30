"use client";

import { useState, useEffect } from "react";
import {
  getApiKey,
  setApiKey,
  getProvider,
  setProvider,
  type AIProvider,
} from "@/lib/storage";

interface Props {
  open: boolean;
  onClose: () => void;
}

const providers: { id: AIProvider; name: string; hint: string }[] = [
  { id: "gemini", name: "Gemini", hint: "Google AI Studio에서 발급" },
  { id: "claude", name: "Claude", hint: "Anthropic Console에서 발급" },
  { id: "gpt", name: "GPT", hint: "OpenAI Platform에서 발급" },
];

export function SettingsDialog({ open, onClose }: Props) {
  const [selected, setSelected] = useState<AIProvider>("gemini");
  const [keys, setKeys] = useState<Record<AIProvider, string>>({
    gemini: "",
    claude: "",
    gpt: "",
  });

  useEffect(() => {
    if (!open) return;
    setSelected(getProvider());
    setKeys({
      gemini: getApiKey("gemini"),
      claude: getApiKey("claude"),
      gpt: getApiKey("gpt"),
    });
  }, [open]);

  const save = () => {
    setProvider(selected);
    for (const p of providers) {
      setApiKey(p.id, keys[p.id]);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">AI 설정</h2>

        {/* Provider selector */}
        <div className="flex gap-2 mb-5">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p.id);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border ${
                selected === p.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Key inputs */}
        {providers.map((p) => (
          <div key={p.id} className={`mb-3 ${selected !== p.id ? "opacity-40" : ""}`}>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">
              {p.name} API Key
              <span className="text-zinc-400 dark:text-zinc-500 ml-1">({p.hint})</span>
            </label>
            <input
              type="password"
              value={keys[p.id]}
              onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
              placeholder={`${p.name} API Key 입력`}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <p className="text-[10px] text-zinc-400 mt-2 mb-4">
          API 키는 브라우저에만 저장되며 서버에 보관하지 않습니다.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            취소
          </button>
          <button
            onClick={save}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
