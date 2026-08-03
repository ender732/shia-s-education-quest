import { Eraser, Undo2 } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "@/i18n";

export type ScribblePadHandle = {
  /** JPEG data URL, or null if the pad is blank. */
  exportImage: () => string | null;
  clear: () => void;
  undo: () => void;
  hasInk: () => boolean;
};

type Props = {
  disabled?: boolean;
  className?: string;
  /** CSS height of the drawing surface (default tall enough for finger/Pencil). */
  heightPx?: number;
  onInkChange?: (hasInk: boolean) => void;
  label?: string;
};

const MAX_DPR = 2;
const UNDO_LIMIT = 24;
const STROKE_COLOR = "#1a1a1a";
const LINE_WIDTH_CSS = 2.5;

function isBlankCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const sample = ctx.getImageData(0, 0, w, h).data;
  // Any non-transparent pixel counts as ink (white bg is opaque).
  for (let i = 0; i < sample.length; i += 16) {
    if (sample[i + 3] > 0 && (sample[i] < 250 || sample[i + 1] < 250 || sample[i + 2] < 250)) {
      return false;
    }
  }
  return true;
}

export const ScribblePad = forwardRef<ScribblePadHandle, Props>(function ScribblePad(
  { disabled = false, className = "", heightPx = 200, onInkChange, label },
  ref,
) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const notifyInk = useCallback(
    (next: boolean) => {
      if (hasInkRef.current === next) return;
      hasInkRef.current = next;
      setHasInk(next);
      onInkChange?.(next);
    },
    [onInkChange],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const cssW = Math.max(1, Math.floor(wrap.clientWidth));
    const cssH = heightPx;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    const prev = canvas.toDataURL("image/png");
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = LINE_WIDTH_CSS;

    // Restore previous drawing after resize when possible.
    if (prev && prev.length > 100) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.drawImage(img, 0, 0, cssW, cssH);
      };
      img.src = prev;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }, [heightPx]);

  useEffect(() => {
    resizeCanvas();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const pointerPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const pushUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(snap);
      if (undoStackRef.current.length > UNDO_LIMIT) {
        undoStackRef.current.shift();
      }
      setCanUndo(true);
    } catch {
      // Security / memory edge cases — ignore snapshot failure.
    }
  };

  const clearPad = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    pushUndo();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = LINE_WIDTH_CSS;
    notifyInk(false);
  }, [notifyInk]);

  const undoPad = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const prev = undoStackRef.current.pop();
    if (!canvas || !ctx || !prev) {
      setCanUndo(false);
      return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(prev, 0, 0);
    ctx.restore();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = LINE_WIDTH_CSS;
    setCanUndo(undoStackRef.current.length > 0);
    notifyInk(!isBlankCanvas(ctx, canvas.width, canvas.height));
  }, [notifyInk]);

  useImperativeHandle(
    ref,
    () => ({
      exportImage: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !hasInkRef.current) return null;
        if (isBlankCanvas(ctx, canvas.width, canvas.height)) return null;
        return canvas.toDataURL("image/jpeg", 0.72);
      },
      clear: clearPad,
      undo: undoPad,
      hasInk: () => hasInkRef.current,
    }),
    [clearPad, undoPad],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    // Prefer primary stylus / touch / mouse; ignore secondary buttons.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    pushUndo();
    drawingRef.current = true;
    lastRef.current = pointerPos(e);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const last = lastRef.current;
    if (!ctx || !last) return;

    const next = pointerPos(e);
    const pressure =
      e.pointerType === "pen" && e.pressure > 0 ? 0.6 + e.pressure * 1.4 : 1;
    ctx.beginPath();
    ctx.lineWidth = LINE_WIDTH_CSS * pressure;
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastRef.current = next;
    if (!hasInkRef.current) notifyInk(true);
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {label ?? t("scribble.defaultLabel")}
          {hasInk ? (
            <span className="ms-2 font-normal text-success">{t("scribble.inkSaved")}</span>
          ) : (
            <span className="ms-2 font-normal">{t("scribble.fingerOrPencil")}</span>
          )}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={disabled || !canUndo}
            onClick={undoPad}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-40"
            aria-label={t("scribble.undoAria")}
          >
            <Undo2 className="size-4" />
            <span className="hidden sm:inline">{t("scribble.undo")}</span>
          </button>
          <button
            type="button"
            disabled={disabled || !hasInk}
            onClick={clearPad}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-40"
            aria-label={t("scribble.clearAria")}
          >
            <Eraser className="size-4" />
            <span className="hidden sm:inline">{t("scribble.clear")}</span>
          </button>
        </div>
      </div>
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-white"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label ?? t("scribble.canvasAria")}
          className="block w-full touch-none select-none"
          style={{
            touchAction: "none",
            height: heightPx,
            cursor: disabled ? "not-allowed" : "crosshair",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(e) => {
            if (drawingRef.current && e.buttons === 0) endStroke(e);
          }}
        />
      </div>
    </div>
  );
});
