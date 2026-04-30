"use client";

import { useState, useCallback, useEffect } from "react";
import { PdfUploader } from "@/components/pdf-uploader";
import { DualView } from "@/components/dual-view";
import { SettingsDialog } from "@/components/settings-dialog";
import { Footer } from "@/components/footer";
import { loadPdf, extractPageData, type PageData } from "@/lib/pdf-extract";
import { getDarkMode, setDarkMode, getProvider, getApiKey } from "@/lib/storage";

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [pages, setPages] = useState<PageData[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [fileName, setFileName] = useState("");
  const [currentProvider, setCurrentProvider] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const d = getDarkMode();
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    const p = getProvider();
    setCurrentProvider(p);
    setHasKey(!!getApiKey(p));
  }, [settingsOpen]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const pdfDoc = await loadPdf(file);
      setPdf(pdfDoc);
      const pageData = await extractPageData(pdfDoc);
      setPages(pageData);
    } catch (err) {
      console.error("PDF parse error:", err);
    }
    setParsing(false);
  }, []);

  const reset = () => {
    setPdf(null);
    setPages(null);
    setFileName("");
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight cursor-pointer" onClick={reset}>
            Paper Translator
          </h1>
          {fileName && (
            <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
            aria-label="Toggle dark mode"
          >
            {dark ? "\u2600" : "\u263D"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`px-3 py-1.5 text-sm border rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 ${
              hasKey
                ? "border-green-400 dark:border-green-700 text-green-700 dark:text-green-400"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {hasKey && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 uppercase">
                {currentProvider}
              </span>
            )}
            AI 설정
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {pdf && pages ? (
          <DualView pdf={pdf} pages={pages} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="w-full max-w-xl">
              <PdfUploader onFileSelect={handleFile} loading={parsing} />
              <p className="text-center text-xs text-zinc-400 mt-4">
                PDF를 올리면 원본 그대로 보여주고, 영어 텍스트만 한국어로 바꿔줍니다
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
