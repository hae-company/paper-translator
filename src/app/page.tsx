"use client";

import { useState, useCallback, useEffect } from "react";
import { PdfUploader } from "@/components/pdf-uploader";
import { DualView } from "@/components/dual-view";
import { SettingsDialog } from "@/components/settings-dialog";
import { Footer } from "@/components/footer";
import { extractTextFromPdf, type ParagraphBlock } from "@/lib/pdf-extract";
import { getDarkMode, setDarkMode } from "@/lib/storage";

export default function Home() {
  const [blocks, setBlocks] = useState<ParagraphBlock[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const d = getDarkMode();
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);

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
      const result = await extractTextFromPdf(file);
      setBlocks(result);
    } catch (err) {
      console.error("PDF parse error:", err);
    }
    setParsing(false);
  }, []);

  const reset = () => {
    setBlocks(null);
    setFileName("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h1
            className="text-lg font-bold tracking-tight cursor-pointer"
            onClick={reset}
          >
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
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? "\u2600" : "\u263D"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            AI 설정
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {blocks ? (
          <DualView blocks={blocks} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="w-full max-w-xl">
              <PdfUploader onFileSelect={handleFile} loading={parsing} />
              <p className="text-center text-xs text-zinc-400 mt-4">
                Gemini, Claude, GPT 중 선택하여 번역 (API 키 필요)
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
