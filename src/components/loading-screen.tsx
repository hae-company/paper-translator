"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1200);
    const t2 = setTimeout(() => setVisible(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-opacity duration-1000 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <Image
        src="/logo-light.svg"
        alt="hae02y"
        width={100}
        height={69}
        className="mb-6 opacity-50 dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        alt="hae02y"
        width={100}
        height={69}
        className="mb-6 opacity-50 hidden dark:block"
      />
      <h1 className="text-2xl font-light tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-2">
        Paper Translator
      </h1>
      <p className="text-xs text-zinc-400">PDF 논문 AI 번역기</p>
    </div>
  );
}
