"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PageData, TextBlock } from "@/lib/pdf-extract";
import { renderPageToCanvas } from "@/lib/pdf-extract";
import { getApiKey, getProvider, getGlossary } from "@/lib/storage";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  pages: PageData[];
}

// Group nearby text items into lines
function groupIntoLines(blocks: TextBlock[]): { text: string; x: number; y: number; width: number; height: number; fontSize: number }[] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: typeof sorted = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    // Same line if Y is close
    if (Math.abs(b.y - current.y) < current.fontSize * 0.5) {
      current.text += b.text;
      current.width = b.x + b.width - current.x;
    } else {
      lines.push(current);
      current = { ...b };
    }
  }
  lines.push(current);
  return lines;
}

export function DualView({ pdf, pages }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingPage, setTranslatingPage] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const page = pages[currentPage - 1];

  // Render PDF page to canvas
  useEffect(() => {
    if (!canvasRef.current || !pdf) return;
    renderPageToCanvas(pdf, currentPage, canvasRef.current);
  }, [pdf, currentPage]);

  const translatePage = useCallback(async (pageNum: number) => {
    const provider = getProvider();
    const apiKey = getApiKey(provider);
    const glossary = getGlossary();

    if (!apiKey) {
      setError("API 키를 먼저 설정해주세요 (우측 상단 AI 설정)");
      return;
    }

    const pageData = pages[pageNum - 1];
    const lines = groupIntoLines(pageData.blocks);

    setTranslatingPage(pageNum);
    setError(null);

    // Translate all lines of this page in one batch
    const fullText = lines.map(l => l.text).join("\n");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, provider, apiKey, glossary }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const translatedLines = data.translation.split("\n");

      // Map translations back to line positions
      for (let i = 0; i < lines.length; i++) {
        const key = `${pageNum}-${i}`;
        setTranslations(prev => ({
          ...prev,
          [key]: translatedLines[i] || lines[i].text,
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "번역 실패";
      setError(msg);
    }

    setTranslatingPage(null);
  }, [pages]);

  const lines = page ? groupIntoLines(page.blocks) : [];
  const isPageTranslated = lines.some((_, i) => translations[`${currentPage}-${i}`]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0">
        {/* Page navigation */}
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          &larr;
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400 min-w-[80px] text-center">
          {currentPage} / {pages.length}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(pages.length, p + 1))}
          disabled={currentPage >= pages.length}
          className="px-2.5 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          &rarr;
        </button>

        <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />

        {/* Translate this page */}
        <button
          onClick={() => translatePage(currentPage)}
          disabled={translatingPage !== null}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {translatingPage === currentPage ? "번역 중..." : "이 페이지 번역"}
        </button>

        {/* Toggle overlay */}
        {isPageTranslated && (
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showOverlay
                ? "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            {showOverlay ? "번역 보기" : "원문 보기"}
          </button>
        )}

        {/* Translate all pages */}
        <button
          onClick={async () => {
            for (let i = 1; i <= pages.length; i++) {
              await translatePage(i);
            }
          }}
          disabled={translatingPage !== null}
          className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 ml-auto"
        >
          전체 번역
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* PDF view with translation overlay */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center bg-zinc-200 dark:bg-zinc-900 p-4">
        <div className="relative inline-block shadow-xl">
          {/* Rendered PDF page */}
          <canvas ref={canvasRef} className="block" />

          {/* Translation overlay */}
          {showOverlay && page && (
            <div
              className="absolute top-0 left-0"
              style={{ width: page.width, height: page.height }}
            >
              {lines.map((line, i) => {
                const key = `${currentPage}-${i}`;
                const trans = translations[key];
                if (!trans) return null;

                return (
                  <div
                    key={key}
                    className="absolute bg-white/90 dark:bg-zinc-900/90 px-0.5 text-zinc-900 dark:text-zinc-100 leading-tight"
                    style={{
                      left: line.x,
                      top: line.y,
                      width: Math.max(line.width, 100),
                      minHeight: line.height,
                      fontSize: Math.max(line.fontSize * 0.85, 8),
                    }}
                    title={line.text}
                  >
                    {trans}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading overlay */}
          {translatingPage === currentPage && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
              <div className="bg-white dark:bg-zinc-800 px-6 py-3 rounded-xl shadow-lg text-sm">
                번역 중...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
