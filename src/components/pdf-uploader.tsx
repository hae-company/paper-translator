"use client";

import { useCallback, useState } from "react";

interface Props {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

export function PdfUploader({ onFileSelect, loading }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
        transition-all duration-200
        ${dragOver
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
        }
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        id="pdf-input"
        disabled={loading}
      />
      <label htmlFor="pdf-input" className="cursor-pointer">
        {loading ? (
          <>
            <div className="text-4xl mb-4 animate-spin">&#9881;</div>
            <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
              PDF 분석 중...
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">&#128196;</div>
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
              PDF 논문을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
              영어 논문 PDF를 넣으면 AI가 한국어로 번역해줍니다
            </p>
          </>
        )}
      </label>
    </div>
  );
}
