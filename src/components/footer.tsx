"use client";

import Image from "next/image";

export function Footer() {
  return (
    <a
      href="https://blog.hae02y.me"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 py-4 opacity-30 hover:opacity-60 transition-opacity"
    >
      <Image src="/logo-light.svg" alt="hae02y" width={24} height={16} className="dark:hidden" />
      <Image src="/logo-dark.svg" alt="hae02y" width={24} height={16} className="hidden dark:block" />
      <span className="text-[10px] text-zinc-500 tracking-widest">hae02y</span>
    </a>
  );
}
