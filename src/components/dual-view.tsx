"use client";

import { useState, useCallback, useRef } from "react";
import type { ParagraphBlock } from "@/lib/pdf-extract";
import { getApiKey, getProvider, getGlossary } from "@/lib/storage";

interface Props {
  blocks: ParagraphBlock[];
}

export function DualView({ blocks }: Props) {
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const translateAll = useCallback(async () => {
    const provider = getProvider();
    const apiKey = getApiKey(provider);
    const glossary = getGlossary();

    if (!apiKey) {
      setError("API 키를 먼저 설정해주세요 (우측 상단 설정 버튼)");
      return;
    }

    setError(null);

    for (let i = 0; i < blocks.length; i++) {
      setTranslating(i);
      setProgress(((i) / blocks.length) * 100);

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: blocks[i].text,
            provider,
            apiKey,
            glossary,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "번역 실패");
        }

        const data = await res.json();
        setTranslations((prev) => ({ ...prev, [i]: data.translation }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "번역 실패";
        setTranslations((prev) => ({ ...prev, [i]: `[오류] ${msg}` }));
        if (msg.includes("API")) {
          setError(msg);
          break;
        }
      }
    }

    setTranslating(null);
    setProgress(100);
  }, [blocks]);

  const translateSingle = useCallback(
    async (index: number) => {
      const provider = getProvider();
      const apiKey = getApiKey(provider);
      const glossary = getGlossary();

      if (!apiKey) {
        setError("API 키를 먼저 설정해주세요");
        return;
      }

      setTranslating(index);
      setError(null);

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: blocks[index].text,
            provider,
            apiKey,
            glossary,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "번역 실패");
        }

        const data = await res.json();
        setTranslations((prev) => ({ ...prev, [index]: data.translation }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "번역 실패";
        setTranslations((prev) => ({
          ...prev,
          [index]: `[오류] ${msg}`,
        }));
      }

      setTranslating(null);
    },
    [blocks]
  );

  const downloadTranslation = useCallback(() => {
    const lines = blocks.map((b, i) => {
      const trans = translations[i] || "(미번역)";
      return `=== Page ${b.pageNum} ===\n\n[원문]\n${b.text}\n\n[번역]\n${trans}\n`;
    });
    const blob = new Blob([lines.join("\n---\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translation.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [blocks, translations]);

  const translatedCount = Object.keys(translations).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <button
          onClick={translateAll}
          disabled={translating !== null}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {translating !== null ? `번역 중... (${translating + 1}/${blocks.length})` : "전체 번역"}
        </button>
        {translatedCount > 0 && (
          <button
            onClick={downloadTranslation}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            다운로드
          </button>
        )}
        <span className="text-xs text-zinc-400 ml-auto">
          {translatedCount}/{blocks.length} 단락 번역됨
        </span>
      </div>

      {/* Progress bar */}
      {translating !== null && (
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Dual panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Original */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Original
          </h3>
          {blocks.map((block, i) => (
            <div
              key={i}
              onClick={() => {
                setActiveBlock(i);
                if (!translations[i]) translateSingle(i);
              }}
              className={`mb-3 p-3 rounded-lg text-sm leading-relaxed cursor-pointer transition-all ${
                activeBlock === i
                  ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-700"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              } ${translating === i ? "animate-pulse" : ""}`}
            >
              <span className="text-[10px] text-zinc-400 mr-2">p.{block.pageNum}</span>
              {block.text}
            </div>
          ))}
        </div>

        {/* Translation */}
        <div ref={rightRef} className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Translation
          </h3>
          {blocks.map((block, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg text-sm leading-relaxed transition-all ${
                activeBlock === i
                  ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-700"
                  : ""
              }`}
            >
              <span className="text-[10px] text-zinc-400 mr-2">p.{block.pageNum}</span>
              {translations[i] ? (
                <span>{translations[i]}</span>
              ) : translating === i ? (
                <span className="text-zinc-400 animate-pulse">번역 중...</span>
              ) : (
                <span className="text-zinc-300 dark:text-zinc-600">
                  원문을 클릭하면 번역됩니다
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
