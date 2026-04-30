"use client";

import { useState, useMemo } from "react";
import type { PageData } from "@/lib/pdf-extract";

interface Props {
  open: boolean;
  onClose: () => void;
  pages: PageData[];
  translations: Record<string, string>;
  fileName: string;
}

export function SaveDialog({ open, onClose, pages, translations, fileName }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [format, setFormat] = useState<"txt" | "md">("txt");

  // Calculate which pages have translations
  const pageStatus = useMemo(() => {
    return pages.map((page, pi) => {
      const total = page.sentences.length;
      const translated = page.sentences.filter((_, si) => translations[`${pi + 1}-${si}`]).length;
      return { pageNum: pi + 1, total, translated, complete: translated === total && total > 0 };
    });
  }, [pages, translations]);

  const hasAnyTranslation = pageStatus.some(p => p.translated > 0);

  // Select all translated pages by default when opening
  useState(() => {
    const translatedPages = pageStatus.filter(p => p.translated > 0).map(p => p.pageNum);
    setSelected(new Set(translatedPages));
  });

  const togglePage = (pageNum: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const selectAll = () => {
    const translatedPages = pageStatus.filter(p => p.translated > 0).map(p => p.pageNum);
    setSelected(new Set(translatedPages));
  };

  const selectNone = () => setSelected(new Set());

  const download = () => {
    const sortedPages = [...selected].sort((a, b) => a - b);
    let content = "";
    const baseName = fileName.replace(/\.pdf$/i, "");

    if (format === "md") {
      content = `# ${baseName} - 번역\n\n`;
      for (const pageNum of sortedPages) {
        const page = pages[pageNum - 1];
        content += `## Page ${pageNum}\n\n`;
        for (let i = 0; i < page.sentences.length; i++) {
          const trans = translations[`${pageNum}-${i}`];
          if (trans) {
            content += `${trans}\n\n`;
            content += `> ${page.sentences[i]}\n\n`;
          }
        }
        content += `---\n\n`;
      }
    } else {
      content = `${baseName} - 번역\n${"=".repeat(40)}\n\n`;
      for (const pageNum of sortedPages) {
        const page = pages[pageNum - 1];
        content += `[Page ${pageNum}]\n\n`;
        for (let i = 0; i < page.sentences.length; i++) {
          const trans = translations[`${pageNum}-${i}`];
          if (trans) {
            content += `${trans}\n`;
            content += `  원문: ${page.sentences[i]}\n\n`;
          }
        }
        content += `${"─".repeat(40)}\n\n`;
      }
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_translated.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">번역 저장</h2>
          <p className="text-xs text-zinc-400 mt-1">저장할 페이지를 선택하세요</p>
        </div>

        {/* Format selector */}
        <div className="px-5 pb-3 flex gap-2">
          <button
            onClick={() => setFormat("txt")}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              format === "txt"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            .txt
          </button>
          <button
            onClick={() => setFormat("md")}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              format === "md"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            .md (마크다운)
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">전체선택</button>
            <button onClick={selectNone} className="text-xs text-zinc-400 hover:underline">해제</button>
          </div>
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {pageStatus.map(({ pageNum, total, translated, complete }) => {
            const hasTranslation = translated > 0;
            return (
              <label
                key={pageNum}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                  !hasTranslation ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                } ${selected.has(pageNum) ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(pageNum)}
                  onChange={() => hasTranslation && togglePage(pageNum)}
                  disabled={!hasTranslation}
                  className="rounded"
                />
                <span className="text-sm flex-1">Page {pageNum}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  complete
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : translated > 0
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                }`}>
                  {translated}/{total}
                </span>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-400">
            {selected.size}개 페이지 선택됨
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              취소
            </button>
            <button
              onClick={download}
              disabled={selected.size === 0 || !hasAnyTranslation}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
