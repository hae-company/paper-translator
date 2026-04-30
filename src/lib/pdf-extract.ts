import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface PageData {
  pageNum: number;
  width: number;
  height: number;
  blocks: TextBlock[];
}

export async function loadPdf(file: File) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

export async function extractPageData(
  pdf: { getPage: (n: number) => Promise<unknown>; numPages: number }
): Promise<PageData[]> {
  const pages: PageData[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = await pdf.getPage(i) as any;
    const viewport = page.getViewport({ scale: 1.5 });
    const content = await page.getTextContent();

    const blocks: TextBlock[] = [];

    for (const item of content.items) {
      const t = item as TextItem;
      if (!t.str || t.str.trim().length === 0) continue;

      const tx = t.transform;
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);

      blocks.push({
        text: t.str,
        x: tx[4] * 1.5, // scale factor
        y: viewport.height - tx[5] * 1.5 - fontSize * 1.5, // flip Y
        width: t.width * 1.5,
        height: fontSize * 1.5 * 1.2,
        fontSize: fontSize * 1.5,
      });
    }

    pages.push({
      pageNum: i,
      width: viewport.width,
      height: viewport.height,
      blocks,
    });
  }

  return pages;
}

export async function renderPageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageNum: number,
  canvas: HTMLCanvasElement
) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
}
