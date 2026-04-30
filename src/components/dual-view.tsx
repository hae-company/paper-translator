"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PageData } from "@/lib/pdf-extract";
import { getApiKey, getProvider, getGlossary } from "@/lib/storage";
import { SaveDialog } from "./save-dialog";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  pages: PageData[];
  fileName: string;
}

export function DualView({ pdf, pages, fileName }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const page = pages[currentPage - 1];
  const sentences = page?.sentences || [];

  // Render PDF page to canvas
  useEffect(() => {
    if (!canvasRef.current || !pdf) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    let cancelled = false;
    (async () => {
      try {
        const pg = await pdf.getPage(currentPage);
        if (cancelled) return;
        const viewport = pg.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        const task = pg.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch { /* cancelled */ }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdf, currentPage]);

  // Translate one sentence
  const translateSentence = useCallback(async (pageNum: number, idx: number, text: string) => {
    const provider = getProvider();
    const apiKey = getApiKey(provider);
    const glossary = getGlossary();
    if (!apiKey) {
      setError("API 키를 먼저 설정해주세요 (우측 상단 AI 설정)");
      return false;
    }

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider, apiKey, glossary }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Translation API error:", data);
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTranslations(prev => ({ ...prev, [`${pageNum}-${idx}`]: data.translation }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "번역 실패");
      return false;
    }
  }, []);

  // Translate entire page sentence by sentence
  const translatePage = useCallback(async (pageNum: number) => {
    const pageSentences = pages[pageNum - 1]?.sentences || [];
    if (pageSentences.length === 0) return;

    setError(null);
    setShowTranslation(true);

    for (let i = 0; i < pageSentences.length; i++) {
      const key = `${pageNum}-${i}`;
      if (translations[key]) continue; // already translated

      setTranslatingIdx(i);
      setProgress(Math.round((i / pageSentences.length) * 100));

      const ok = await translateSentence(pageNum, i, pageSentences[i]);
      if (!ok) {
        setTranslatingIdx(null);
        return;
      }

      // Small delay to avoid rate limits
      if (i < pageSentences.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setTranslatingIdx(null);
    setProgress(100);
  }, [pages, translations, translateSentence]);

  const isPageTranslated = sentences.some((_, i) => translations[`${currentPage}-${i}`]);
  const translatedCount = sentences.filter((_, i) => translations[`${currentPage}-${i}`]).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0 flex-wrap">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-30"
        >
          &larr;
        </button>
        <span className="text-sm text-zinc-500 min-w-[60px] text-center">
          {currentPage} / {pages.length}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(pages.length, p + 1))}
          disabled={currentPage >= pages.length}
          className="px-2.5 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-30"
        >
          &rarr;
        </button>

        <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        <button
          onClick={() => translatePage(currentPage)}
          disabled={translatingIdx !== null}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {translatingIdx !== null
            ? `번역 중 ${translatingIdx + 1}/${sentences.length} (${progress}%)`
            : "이 페이지 번역"}
        </button>

        {isPageTranslated && (
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showTranslation
                ? "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            {showTranslation ? "번역문 보기 중" : "원문 보기 중"}
          </button>
        )}

        {/* Save button */}
        {Object.keys(translations).length > 0 && (
          <button
            onClick={() => setSaveOpen(true)}
            className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            저장
          </button>
        )}

        {isPageTranslated && (
          <span className="text-xs text-zinc-400 ml-auto">
            {translatedCount}/{sentences.length} 문장
          </span>
        )}
      </div>

      {/* Progress bar */}
      {translatingIdx !== null && (
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Content area — both views always mounted, toggle with display */}
      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 relative">
        {/* PDF view — always rendered, hidden when showing translation */}
        <div className={`flex justify-center p-4 ${showTranslation ? "hidden" : ""}`}>
          <div className="shadow-xl">
            <canvas ref={canvasRef} className="block bg-white" />
          </div>
        </div>

        {/* Translation view */}
        <div className={`max-w-3xl mx-auto py-8 px-6 ${showTranslation ? "" : "hidden"}`}>
          {sentences.map((sentence, i) => {
            const key = `${currentPage}-${i}`;
            const trans = translations[key];

            return (
              <div key={i} className="mb-4 group">
                {trans ? (
                  <p className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {trans}
                  </p>
                ) : translatingIdx === i ? (
                  <p className="text-base text-zinc-400 animate-pulse">번역 중...</p>
                ) : (
                  <p className="text-base text-zinc-400 italic">{sentence}</p>
                )}
                {trans && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {sentence}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        pages={pages}
        translations={translations}
        fileName={fileName}
      />
    </div>
  );
}
