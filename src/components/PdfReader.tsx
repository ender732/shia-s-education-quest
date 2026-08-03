import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

type PdfReaderProps = {
  url: string;
  title?: string;
};

type ReactPdfApi = {
  Document: typeof import("react-pdf").Document;
  Page: typeof import("react-pdf").Page;
};

/**
 * Browser-only PDF viewer. react-pdf / pdfjs-dist must never evaluate in Node
 * (Netlify functions crash with `DOMMatrix is not defined` on import).
 */
export function PdfReader({ url, title }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [pdf, setPdf] = useState<ReactPdfApi | null>(null);
  const { t, formatNumber } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [{ Document, Page, pdfjs }] = await Promise.all([
          import("react-pdf"),
          import("react-pdf/dist/Page/AnnotationLayer.css"),
          import("react-pdf/dist/Page/TextLayer.css"),
        ]);

        // Must live with Document/Page (Vite bundles the worker).
        // Keep new URL(...) on one line — multiline breaks asset bundling on Vite ≥7.1.
        // prettier-ignore
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        if (!cancelled) setPdf({ Document, Page });
      } catch (err) {
        console.error("[PdfReader] failed to load react-pdf", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setZoom(1);
    setNumPages(0);
    setLoadError(false);
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      // Leave a little padding so the page doesn't touch the scroll edges.
      setContainerWidth(Math.max(0, el.clientWidth - 16));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageWidth = containerWidth > 0 ? Math.floor(containerWidth * zoom) : undefined;

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () => setPageNumber((p) => Math.min(numPages || p, p + 1));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));

  const Document = pdf?.Document;
  const Page = pdf?.Page;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      role="region"
      aria-label={title ? t("pdf.readingAria", { title }) : t("pdf.regionAria")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/60 px-2 py-2 sm:px-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageNumber <= 1}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("pdf.previousPage")}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <span
            className="min-w-[5.5rem] px-1 text-center text-xs font-semibold tabular-nums text-foreground sm:text-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            {numPages > 0
              ? t("pdf.pageOf", {
                  page: formatNumber(pageNumber),
                  total: formatNumber(numPages),
                })
              : t("common.none")}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!numPages || pageNumber >= numPages}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("pdf.nextPage")}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("pdf.zoomOut")}
          >
            <ZoomOut className="size-4" aria-hidden />
          </button>
          <span
            className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("pdf.zoomIn")}
          >
            <ZoomIn className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex h-[30rem] flex-1 justify-center overflow-auto bg-background p-2"
      >
        {loadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <p>{t("pdf.loadFailed")}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t("pdf.openInNewTab")}
            </a>
          </div>
        ) : !Document || !Page ? (
          <div className="flex flex-1 items-center justify-center gap-2 self-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("pdf.loadingReader")}
          </div>
        ) : (
          <Document
            file={url}
            loading={
              <div className="flex flex-1 items-center justify-center gap-2 self-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("pdf.loadingPages")}
              </div>
            }
            onLoadSuccess={({ numPages: pages }) => {
              setNumPages(pages);
              setLoadError(false);
            }}
            onLoadError={(err) => {
              console.error("[PdfReader]", err);
              setLoadError(true);
            }}
            className="flex justify-center"
          >
            {pageWidth ? (
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                loading={
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    <Loader2 className="me-2 size-4 animate-spin" /> {t("pdf.renderingPage")}
                  </div>
                }
                className="shadow-sm"
                renderTextLayer
                renderAnnotationLayer
              />
            ) : null}
          </Document>
        )}
      </div>
    </div>
  );
}
