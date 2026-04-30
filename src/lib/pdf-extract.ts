import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PageData {
  pageNum: number;
  width: number;
  height: number;
  sentences: string[];
}

export async function loadPdf(file: File) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

export async function extractPageData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any
): Promise<PageData[]> {
  const pages: PageData[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const content = await page.getTextContent();

    const items = content.items as TextItem[];
    if (items.length === 0) {
      pages.push({ pageNum: i, width: viewport.width, height: viewport.height, sentences: [] });
      continue;
    }

    // Sort by Y (top to bottom), then X
    const sorted = items
      .filter((t) => t.str && t.str.trim().length > 0)
      .map((t) => ({
        str: t.str,
        y: Math.round(t.transform[5]),
        x: t.transform[4],
        fontSize: Math.sqrt(t.transform[0] ** 2 + t.transform[1] ** 2),
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    // Group into lines
    const lines: string[] = [];
    let currentLine = sorted[0].str;
    let currentY = sorted[0].y;
    let lastFontSize = sorted[0].fontSize;

    for (let j = 1; j < sorted.length; j++) {
      const item = sorted[j];
      if (Math.abs(item.y - currentY) <= lastFontSize * 0.5) {
        currentLine += item.str;
      } else {
        lines.push(currentLine.trim());
        currentLine = item.str;
        currentY = item.y;
        lastFontSize = item.fontSize;
      }
    }
    lines.push(currentLine.trim());

    // Join all lines into one text block, then split by sentences
    const fullText = lines.filter(l => l.length > 0).join(" ");
    const sentences = splitIntoSentences(fullText);

    pages.push({
      pageNum: i,
      width: viewport.width,
      height: viewport.height,
      sentences,
    });
  }

  return pages;
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: period/question/exclamation followed by space and capital letter
  // But avoid splitting on abbreviations like "e.g.", "i.e.", "et al.", numbers like "3.5"
  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z\d\[])/);

  // Merge very short fragments (< 20 chars) with the previous sentence
  const result: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length < 20 && result.length > 0) {
      result[result.length - 1] += " " + trimmed;
    } else {
      result.push(trimmed);
    }
  }
  return result;
}
