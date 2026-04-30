import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface ParagraphBlock {
  pageNum: number;
  text: string;
}

export async function extractTextFromPdf(file: File): Promise<ParagraphBlock[]> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use local worker file copied to public/
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const blocks: ParagraphBlock[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let currentParagraph = "";
    let lastY: number | null = null;

    for (const item of content.items) {
      const textItem = item as TextItem;
      if (!textItem.str) continue;

      const y = textItem.transform[5];

      // New paragraph if Y position jumps significantly
      if (lastY !== null && Math.abs(y - lastY) > 12) {
        const trimmed = currentParagraph.trim();
        if (trimmed.length > 10) {
          blocks.push({ pageNum: i, text: trimmed });
        }
        currentParagraph = "";
      }

      currentParagraph += textItem.str + " ";
      lastY = y;
    }

    // Push remaining text
    const trimmed = currentParagraph.trim();
    if (trimmed.length > 10) {
      blocks.push({ pageNum: i, text: trimmed });
    }
  }

  return blocks;
}
