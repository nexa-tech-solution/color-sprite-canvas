import { useEffect, useRef, useState, useCallback } from "react";
import { usePaintStore, type Point, type CanvasImage } from "@/stores/paintStore";

// Cache HTMLImageElement instances by src
const imgCache = new Map<string, HTMLImageElement>();
function getImage(src: string): HTMLImageElement {
  let img = imgCache.get(src);
  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    imgCache.set(src, img);
  }
  return img;
}

export function CanvasSurface() {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const drawingRef = useRef<{ id: string } | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const dragImgRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    imgX: number;
    imgY: number;
    historyCaptured: boolean;
  } | null>(null);
  const spaceRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const s = usePaintStore();

  // resize
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // keyboard: space = pan, ctrl+z / y
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = true;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) usePaintStore.getState().redo();
        else usePaintStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        usePaintStore.getState().redo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && usePaintStore.getState().selectedImageId) {
        usePaintStore.getState().removeImage(usePaintStore.getState().selectedImageId!);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const st = usePaintStore.getState();
    const { transform, strokes, images, selectedImageId, tool } = st;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // draw images (below outline layer heuristic: images with isOutline drawn last)
    const bgImages = images.filter((i) => !i.isOutline);
    const outlineImages = images.filter((i) => i.isOutline);

    for (const im of bgImages) drawImage(ctx, im);

    // strokes between bg images and outline images so painting under outline works
    for (const stroke of strokes) {
      ctx.globalAlpha = stroke.opacity;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;
      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation =
          stroke.tool === "marker" ? "multiply" : "source-over";
        ctx.strokeStyle = stroke.color;
      }
      const p = stroke.points;
      if (p.length < 2) {
        ctx.beginPath();
        ctx.arc(p[0].x, p[0].y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length - 1; i++) {
          const mx = (p[i].x + p[i + 1].x) / 2;
          const my = (p[i].y + p[i + 1].y) / 2;
          ctx.quadraticCurveTo(p[i].x, p[i].y, mx, my);
        }
        ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // outline layer with multiply so strokes below stay visible
    for (const im of outlineImages) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      drawImage(ctx, im);
      ctx.restore();
    }

    // selection outline
    if (selectedImageId && tool === "select") {
      const im = images.find((i) => i.id === selectedImageId);
      if (im) {
        ctx.save();
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 2 / transform.scale;
        ctx.setLineDash([8 / transform.scale, 6 / transform.scale]);
        ctx.strokeRect(im.x, im.y, im.width, im.height);
        ctx.setLineDash([]);
        // handles
        const hs = 8 / transform.scale;
        const drawHandle = (x: number, y: number) => {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#ec4899";
          ctx.lineWidth = 2 / transform.scale;
          ctx.beginPath();
          ctx.arc(x, y, hs, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        };
        drawHandle(im.x, im.y);
        drawHandle(im.x + im.width, im.y);
        drawHandle(im.x, im.y + im.height);
        drawHandle(im.x + im.width, im.y + im.height);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [size]);

  function drawImage(ctx: CanvasRenderingContext2D, im: CanvasImage) {
    const img = getImage(im.src);
    if (!img.complete) {
      img.onload = () => scheduleRedraw();
      return;
    }
    ctx.globalAlpha = im.opacity;
    ctx.drawImage(img, im.x, im.y, im.width, im.height);
    ctx.globalAlpha = 1;
  }

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  // subscribe to store changes
  useEffect(() => {
    const unsub = usePaintStore.subscribe(() => scheduleRedraw());
    scheduleRedraw();
    return unsub;
  }, [scheduleRedraw]);

  useEffect(() => scheduleRedraw(), [size, scheduleRedraw]);

  // helpers
  function screenToWorld(clientX: number, clientY: number): Point {
    const rect = ref.current!.getBoundingClientRect();
    const t = usePaintStore.getState().transform;
    return {
      x: (clientX - rect.left - t.x) / t.scale,
      y: (clientY - rect.top - t.y) / t.scale,
    };
  }

  function hitImage(p: Point): CanvasImage | undefined {
    const imgs = usePaintStore.getState().images;
    for (let i = imgs.length - 1; i >= 0; i--) {
      const im = imgs[i];
      if (p.x >= im.x && p.x <= im.x + im.width && p.y >= im.y && p.y <= im.y + im.height) return im;
    }
    return undefined;
  }

  // pointer handlers
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const st = usePaintStore.getState();
    const isPan = st.tool === "pan" || spaceRef.current || e.button === 1;
    if (isPan) {
      panRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (st.tool === "select") {
      const wp = screenToWorld(e.clientX, e.clientY);
      const hit = hitImage(wp);
      if (hit) {
        st.selectImage(hit.id);
        dragImgRef.current = {
          id: hit.id,
          startX: e.clientX,
          startY: e.clientY,
          imgX: hit.x,
          imgY: hit.y,
          historyCaptured: false,
        };
      } else {
        st.selectImage(null);
      }
      return;
    }
    // drawing
    const wp = screenToWorld(e.clientX, e.clientY);
    const id = crypto.randomUUID();
    const tool = st.tool as "pencil" | "brush" | "marker" | "eraser";
    const sizes: Record<string, number> = {
      pencil: Math.max(2, st.brushSize * 0.4),
      brush: st.brushSize,
      marker: st.brushSize * 1.4,
      eraser: st.brushSize * 1.6,
    };
    const opacities: Record<string, number> = {
      pencil: st.opacity,
      brush: st.opacity,
      marker: 0.55 * st.opacity,
      eraser: 1,
    };
    if (["pencil", "brush", "marker", "eraser"].includes(st.tool)) {
      st.beginStroke({
        id,
        tool,
        color: st.color,
        size: sizes[tool],
        opacity: opacities[tool],
        points: [wp],
      });
      drawingRef.current = { id };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = usePaintStore.getState();
    if (panRef.current) {
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      panRef.current = { x: e.clientX, y: e.clientY };
      st.panBy(dx, dy);
      return;
    }
    if (dragImgRef.current) {
      const t = st.transform;
      const dx = (e.clientX - dragImgRef.current.startX) / t.scale;
      const dy = (e.clientY - dragImgRef.current.startY) / t.scale;
      if (!dragImgRef.current.historyCaptured && (dx !== 0 || dy !== 0)) {
        st.pushHistory();
        dragImgRef.current.historyCaptured = true;
      }
      st.updateImage(dragImgRef.current.id, {
        x: dragImgRef.current.imgX + dx,
        y: dragImgRef.current.imgY + dy,
      });
      return;
    }
    if (drawingRef.current) {
      const wp = screenToWorld(e.clientX, e.clientY);
      st.extendStroke(drawingRef.current.id, wp);
    }
  };

  const onPointerUp = () => {
    if (drawingRef.current) {
      usePaintStore.getState().endStroke();
      drawingRef.current = null;
    }
    dragImgRef.current = null;
    panRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const st = usePaintStore.getState();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 20) {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const rect = ref.current!.getBoundingClientRect();
      st.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      st.panBy(-e.deltaX, -e.deltaY);
    }
  };

  const cursor =
    s.tool === "pan" || spaceRef.current
      ? "grab"
      : s.tool === "select"
        ? "default"
        : "crosshair";

  return (
    <canvas
      ref={ref}
      style={{ width: size.w, height: size.h, cursor, touchAction: "none" }}
      className="fixed inset-0 dot-grid"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    />
  );
}
