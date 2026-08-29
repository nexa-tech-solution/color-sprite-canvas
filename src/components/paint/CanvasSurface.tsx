import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  usePaintStore,
  type Point,
  type CanvasImage,
  type ToolId,
  type Transform,
} from "@/stores/paintStore";

type ResizeHandle = "nw" | "ne" | "sw" | "se";
type SelectionHandle = ResizeHandle | "rotate";
type TouchPointList = ArrayLike<{ clientX: number; clientY: number }>;
type TouchGesture =
  | {
      kind: "canvas";
      startDistance: number;
      startMidpoint: { x: number; y: number };
      startTransform: Transform;
    }
  | {
      kind: "sticker";
      id: string;
      startDistance: number;
      startMidpoint: { x: number; y: number };
      startTransform: Transform;
      startWidth: number;
      startHeight: number;
      startCenter: Point;
      historyCaptured: boolean;
    };

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

function getBackgroundImage(images: CanvasImage[]) {
  return images.find((image) => image.kind !== "sticker") ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return { w: 0, h: 0 };
  }

  return { w: window.innerWidth, h: window.innerHeight };
}

function getImageRotation(image: CanvasImage) {
  return image.rotation ?? 0;
}

function getImageCenter(image: CanvasImage) {
  return {
    x: image.x + image.width / 2,
    y: image.y + image.height / 2,
  };
}

function rotateVector(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function toImageLocal(point: Point, image: CanvasImage) {
  const center = getImageCenter(image);
  return rotateVector(point.x - center.x, point.y - center.y, -getImageRotation(image));
}

function getStickerCorners(image: CanvasImage) {
  const center = getImageCenter(image);
  const halfWidth = image.width / 2;
  const halfHeight = image.height / 2;
  const rotation = getImageRotation(image);

  return {
    nw: (() => {
      const offset = rotateVector(-halfWidth, -halfHeight, rotation);
      return { x: center.x + offset.x, y: center.y + offset.y };
    })(),
    ne: (() => {
      const offset = rotateVector(halfWidth, -halfHeight, rotation);
      return { x: center.x + offset.x, y: center.y + offset.y };
    })(),
    sw: (() => {
      const offset = rotateVector(-halfWidth, halfHeight, rotation);
      return { x: center.x + offset.x, y: center.y + offset.y };
    })(),
    se: (() => {
      const offset = rotateVector(halfWidth, halfHeight, rotation);
      return { x: center.x + offset.x, y: center.y + offset.y };
    })(),
  };
}

function getRotateHandlePosition(image: CanvasImage, distance: number) {
  const center = getImageCenter(image);
  const offset = rotateVector(0, -(image.height / 2 + distance), getImageRotation(image));
  return { x: center.x + offset.x, y: center.y + offset.y };
}

function containImageWithinBackground(image: CanvasImage, background: CanvasImage | null) {
  if (!background || image.kind !== "sticker") return image;

  const corners = Object.values(getStickerCorners(image));
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const dx =
    minX < background.x
      ? background.x - minX
      : maxX > background.x + background.width
        ? background.x + background.width - maxX
        : 0;
  const dy =
    minY < background.y
      ? background.y - minY
      : maxY > background.y + background.height
        ? background.y + background.height - maxY
        : 0;

  return {
    ...image,
    x: image.x + dx,
    y: image.y + dy,
  };
}

function pointInImage(point: Point, image: CanvasImage | null) {
  if (!image) return true;

  const local = toImageLocal(point, image);

  return (
    local.x >= -image.width / 2 &&
    local.x <= image.width / 2 &&
    local.y >= -image.height / 2 &&
    local.y <= image.height / 2
  );
}

function clampPointToImage(point: Point, image: CanvasImage | null) {
  if (!image) return point;

  return {
    x: clamp(point.x, image.x, image.x + image.width),
    y: clamp(point.y, image.y, image.y + image.height),
  };
}

function getDrawCursor(tool: ToolId, color: string) {
  const cursorMap: Record<
    "pencil" | "brush" | "marker" | "eraser",
    { svg: string; x: number; y: number }
  > = {
    pencil: {
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g transform="rotate(28 16 16)">
            <rect x="12.4" y="3.4" width="7.2" height="18.4" rx="3.6" fill="${color}" stroke="#7c2d5b" stroke-width="1.1"/>
            <rect x="13.1" y="5.2" width="5.8" height="2.8" rx="1.4" fill="#ffd1e8" opacity="0.95"/>
            <path d="M12 21.2h8L16 29.6z" fill="#f5dcc4" stroke="#7c2d5b" stroke-width="1.1" stroke-linejoin="round"/>
            <path d="M14.7 25.8h2.6L16 29.6z" fill="#1f2937"/>
          </g>
        </svg>
      `,
      x: 16,
      y: 29,
    },
    brush: {
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g transform="translate(4 2) rotate(16 12 12)">
            <path d="m14.622 17.897-10.68-2.913" fill="none" stroke="#7c2d5b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z" fill="${color}" fill-opacity="0.68" stroke="#7c2d5b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15" fill="#f5dcc4" stroke="#7c2d5b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
      `,
      x: 6,
      y: 11,
    },
    marker: {
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g transform="rotate(32 16 16)">
            <rect x="11.6" y="4" width="8.8" height="14.8" rx="2.6" fill="${color}" stroke="#7c2d5b" stroke-width="1.1"/>
            <rect x="12.6" y="6" width="6.8" height="2.3" rx="1.1" fill="#ffd1e8" opacity="0.95"/>
            <path d="M11.8 18.8h8.4l-0.8 5-3.4 4-3.4-4z" fill="#f3f4f6" stroke="#7c2d5b" stroke-width="1.1" stroke-linejoin="round"/>
            <path d="M13 23.8h6l-3 4z" fill="#1f2937"/>
          </g>
        </svg>
      `,
      x: 16,
      y: 28,
    },
    eraser: {
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g transform="translate(2 1)">
            <path d="M10.2 22.6 18.9 13.9a2.4 2.4 0 0 1 3.4 0l4.8 4.8a2.4 2.4 0 0 1 0 3.4l-8.7 8.7a2.4 2.4 0 0 1-3.4 0l-4.8-4.8a2.4 2.4 0 0 1 0-3.4z" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M10.2 22.6 18.9 13.9a2.4 2.4 0 0 1 3.4 0l2.4 2.4-12.1 12.1-2.4-2.4a2.4 2.4 0 0 1 0-3.4z" fill="#fecdd3" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M14.9 30.8h9.4" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
          </g>
        </svg>
      `,
      x: 18,
      y: 26,
    },
  };

  if (!["pencil", "brush", "marker", "eraser"].includes(tool)) {
    return "crosshair";
  }

  const { svg, x, y } = cursorMap[tool as "pencil" | "brush" | "marker" | "eraser"];
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`;
}

export function CanvasSurface() {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
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
  const resizeImgRef = useRef<{
    id: string;
    centerX: number;
    centerY: number;
    startWidth: number;
    startHeight: number;
    rotation: number;
    historyCaptured: boolean;
  } | null>(null);
  const rotateImgRef = useRef<{
    id: string;
    centerX: number;
    centerY: number;
    startRotation: number;
    startPointerAngle: number;
    historyCaptured: boolean;
  } | null>(null);
  const spaceRef = useRef(false);
  const [hoveredHandle, setHoveredHandle] = useState<SelectionHandle | null>(null);
  const [size, setSize] = useState(getViewportSize);

  const s = usePaintStore();

  // resize
  useLayoutEffect(() => {
    const syncViewport = () => {
      const viewport = getViewportSize();
      setSize((current) =>
        current.w === viewport.w && current.h === viewport.h ? current : viewport,
      );
      usePaintStore.getState().setViewport({ width: viewport.w, height: viewport.h });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
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
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        usePaintStore.getState().selectedImageId
      ) {
        const selectedImage = usePaintStore
          .getState()
          .images.find((image) => image.id === usePaintStore.getState().selectedImageId);

        if (selectedImage?.kind === "sticker") {
          usePaintStore.getState().removeImage(selectedImage.id);
        }
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
    const background = getBackgroundImage(images);

    const drawImage = (im: CanvasImage) => {
      const img = getImage(im.src);
      if (!img.complete) {
        img.onload = () => {
          if (rafRef.current != null) return;
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            redraw();
          });
        };
        return;
      }
      ctx.globalAlpha = im.opacity;
      const rotation = getImageRotation(im);
      if (rotation === 0) {
        ctx.drawImage(img, im.x, im.y, im.width, im.height);
      } else {
        const center = getImageCenter(im);
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(rotation);
        ctx.drawImage(img, -im.width / 2, -im.height / 2, im.width, im.height);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const bgImages = images.filter((i) => !i.isOutline && i.kind !== "sticker");
    const outlineImages = images.filter((i) => i.isOutline && i.kind !== "sticker");
    const stickerImages = images.filter((i) => i.kind === "sticker");

    if (background) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 12;
      ctx.fillRect(background.x, background.y, background.width, background.height);
      ctx.restore();
    }

    if (background) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(background.x, background.y, background.width, background.height);
      ctx.clip();
    }

    for (const im of bgImages) drawImage(im);

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
        ctx.globalCompositeOperation = stroke.tool === "marker" ? "multiply" : "source-over";
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
      drawImage(im);
      ctx.restore();
    }

    if (background) {
      ctx.restore();
    }

    for (const im of stickerImages) drawImage(im);

    // selection outline
    if (selectedImageId && tool === "select") {
      const im = images.find((i) => i.id === selectedImageId);
      if (im?.kind === "sticker") {
        const corners = getStickerCorners(im);
        const rotateHandle = getRotateHandlePosition(im, 28 / transform.scale);
        const topCenter = rotateVector(0, -im.height / 2, getImageRotation(im));
        const center = getImageCenter(im);

        ctx.save();
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 2 / transform.scale;
        ctx.setLineDash([8 / transform.scale, 6 / transform.scale]);
        ctx.beginPath();
        ctx.moveTo(corners.nw.x, corners.nw.y);
        ctx.lineTo(corners.ne.x, corners.ne.y);
        ctx.lineTo(corners.se.x, corners.se.y);
        ctx.lineTo(corners.sw.x, corners.sw.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(center.x + topCenter.x, center.y + topCenter.y);
        ctx.lineTo(rotateHandle.x, rotateHandle.y);
        ctx.stroke();

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
        drawHandle(corners.nw.x, corners.nw.y);
        drawHandle(corners.ne.x, corners.ne.y);
        drawHandle(corners.sw.x, corners.sw.y);
        drawHandle(corners.se.x, corners.se.y);
        drawHandle(rotateHandle.x, rotateHandle.y);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [size]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  // subscribe to store changes
  useLayoutEffect(() => {
    const unsub = usePaintStore.subscribe(() => scheduleRedraw());
    scheduleRedraw();
    return unsub;
  }, [scheduleRedraw]);

  useEffect(() => scheduleRedraw(), [size, scheduleRedraw]);

  // helpers
  function clearInteractionState() {
    if (drawingRef.current) {
      usePaintStore.getState().endStroke();
      drawingRef.current = null;
    }
    dragImgRef.current = null;
    resizeImgRef.current = null;
    rotateImgRef.current = null;
    panRef.current = null;
    setHoveredHandle(null);
  }

  function toCanvasPoint(clientX: number, clientY: number) {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function screenToWorld(clientX: number, clientY: number): Point {
    const t = usePaintStore.getState().transform;
    const point = toCanvasPoint(clientX, clientY);
    return {
      x: (point.x - t.x) / t.scale,
      y: (point.y - t.y) / t.scale,
    };
  }

  function syncTouchGesture(touches: TouchPointList) {
    if (touches.length < 2) {
      touchGestureRef.current = null;
      return false;
    }

    const firstPoint = toCanvasPoint(touches[0].clientX, touches[0].clientY);
    const secondPoint = toCanvasPoint(touches[1].clientX, touches[1].clientY);
    const midpoint = {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2,
    };
    const distance = Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y);

    if (distance <= 0) return true;

    if (!touchGestureRef.current) {
      const state = usePaintStore.getState();
      const selectedImage = state.images.find((image) => image.id === state.selectedImageId);
      const firstWorldPoint = {
        x: (firstPoint.x - state.transform.x) / state.transform.scale,
        y: (firstPoint.y - state.transform.y) / state.transform.scale,
      };
      const secondWorldPoint = {
        x: (secondPoint.x - state.transform.x) / state.transform.scale,
        y: (secondPoint.y - state.transform.y) / state.transform.scale,
      };

      // A pinch that starts on a selected sticker manipulates that sticker.
      // All other pinches retain the canvas zoom behavior.
      if (
        selectedImage?.kind === "sticker" &&
        pointInImage(firstWorldPoint, selectedImage) &&
        pointInImage(secondWorldPoint, selectedImage)
      ) {
        touchGestureRef.current = {
          kind: "sticker",
          id: selectedImage.id,
          startDistance: distance,
          startMidpoint: midpoint,
          startTransform: { ...state.transform },
          startWidth: selectedImage.width,
          startHeight: selectedImage.height,
          startCenter: getImageCenter(selectedImage),
          historyCaptured: false,
        };
        return true;
      }

      touchGestureRef.current = {
        kind: "canvas",
        startDistance: distance,
        startMidpoint: midpoint,
        startTransform: { ...state.transform },
      };
      return true;
    }

    const gesture = touchGestureRef.current;
    if (!gesture) return true;

    if (gesture.kind === "sticker") {
      const state = usePaintStore.getState();
      const sticker = state.images.find((image) => image.id === gesture.id);
      if (!sticker) return true;

      const scale = Math.max(
        Math.max(0.08, 24 / gesture.startWidth, 24 / gesture.startHeight),
        distance / gesture.startDistance,
      );
      const width = gesture.startWidth * scale;
      const height = gesture.startHeight * scale;
      const center = {
        x:
          gesture.startCenter.x +
          (midpoint.x - gesture.startMidpoint.x) / gesture.startTransform.scale,
        y:
          gesture.startCenter.y +
          (midpoint.y - gesture.startMidpoint.y) / gesture.startTransform.scale,
      };
      const nextImage = containImageWithinBackground(
        {
          ...sticker,
          x: center.x - width / 2,
          y: center.y - height / 2,
          width,
          height,
        },
        getBackgroundImage(state.images),
      );

      if (
        !gesture.historyCaptured &&
        (width !== gesture.startWidth || height !== gesture.startHeight)
      ) {
        state.pushHistory();
        gesture.historyCaptured = true;
      }

      state.updateImage(gesture.id, {
        x: nextImage.x,
        y: nextImage.y,
        width: nextImage.width,
        height: nextImage.height,
      });
      return true;
    }

    const nextScale = gesture.startTransform.scale * (distance / gesture.startDistance);
    const scaleFactor = nextScale / gesture.startTransform.scale;

    usePaintStore.getState().setTransform({
      scale: nextScale,
      x: midpoint.x - (gesture.startMidpoint.x - gesture.startTransform.x) * scaleFactor,
      y: midpoint.y - (gesture.startMidpoint.y - gesture.startTransform.y) * scaleFactor,
    });

    return true;
  }

  function hitImage(p: Point): CanvasImage | undefined {
    const imgs = usePaintStore.getState().images;
    for (let i = imgs.length - 1; i >= 0; i--) {
      const im = imgs[i];
      if (pointInImage(p, im)) return im;
    }
    return undefined;
  }

  function hitSelectionHandle(p: Point): { image: CanvasImage; handle: SelectionHandle } | null {
    const st = usePaintStore.getState();
    if (!st.selectedImageId || st.tool !== "select") return null;

    const image = st.images.find((im) => im.id === st.selectedImageId);
    if (!image || image.kind !== "sticker") return null;

    const radius = Math.max(14 / st.transform.scale, 8);
    const corners = getStickerCorners(image);
    const rotateHandle = getRotateHandlePosition(image, 28 / st.transform.scale);
    const handles: Array<{ handle: SelectionHandle; x: number; y: number }> = [
      { handle: "nw", x: corners.nw.x, y: corners.nw.y },
      { handle: "ne", x: corners.ne.x, y: corners.ne.y },
      { handle: "sw", x: corners.sw.x, y: corners.sw.y },
      { handle: "se", x: corners.se.x, y: corners.se.y },
      { handle: "rotate", x: rotateHandle.x, y: rotateHandle.y },
    ];

    for (const handle of handles) {
      const distance = Math.hypot(p.x - handle.x, p.y - handle.y);
      if (distance <= radius) return { image, handle: handle.handle };
    }

    return null;
  }

  // pointer handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" && touchGestureRef.current) {
      return;
    }

    (e.target as Element).setPointerCapture(e.pointerId);

    const st = usePaintStore.getState();
    const isPan = st.tool === "pan" || spaceRef.current || e.button === 1;
    if (isPan) {
      panRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (st.tool === "select") {
      const wp = screenToWorld(e.clientX, e.clientY);
      const selectionHit = hitSelectionHandle(wp);

      if (selectionHit) {
        const { image, handle } = selectionHit;
        st.selectImage(image.id);
        const center = getImageCenter(image);

        if (handle === "rotate") {
          rotateImgRef.current = {
            id: image.id,
            centerX: center.x,
            centerY: center.y,
            startRotation: getImageRotation(image),
            startPointerAngle: Math.atan2(wp.y - center.y, wp.x - center.x),
            historyCaptured: false,
          };
          return;
        }

        resizeImgRef.current = {
          id: image.id,
          centerX: center.x,
          centerY: center.y,
          startWidth: image.width,
          startHeight: image.height,
          rotation: getImageRotation(image),
          historyCaptured: false,
        };
        return;
      }

      const hit = hitImage(wp);
      if (hit) {
        st.selectImage(hit.id);
        if (hit.kind === "sticker") {
          dragImgRef.current = {
            id: hit.id,
            startX: e.clientX,
            startY: e.clientY,
            imgX: hit.x,
            imgY: hit.y,
            historyCaptured: false,
          };
        }
      } else {
        st.selectImage(null);
      }
      return;
    }
    // drawing
    const wp = screenToWorld(e.clientX, e.clientY);
    const background = getBackgroundImage(st.images);
    if (!pointInImage(wp, background)) return;
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
    if (e.pointerType === "touch" && touchGestureRef.current) {
      return;
    }

    const st = usePaintStore.getState();
    if (
      st.tool === "select" &&
      !dragImgRef.current &&
      !resizeImgRef.current &&
      !rotateImgRef.current &&
      !panRef.current
    ) {
      const wp = screenToWorld(e.clientX, e.clientY);
      setHoveredHandle(hitSelectionHandle(wp)?.handle ?? null);
    }
    if (panRef.current) {
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      panRef.current = { x: e.clientX, y: e.clientY };
      st.panBy(dx, dy);
      return;
    }
    if (rotateImgRef.current) {
      const wp = screenToWorld(e.clientX, e.clientY);
      const rotate = rotateImgRef.current;
      const currentImage = st.images.find((image) => image.id === rotate.id);
      if (!currentImage) return;

      if (!rotate.historyCaptured) {
        st.pushHistory();
        rotate.historyCaptured = true;
      }

      const pointerAngle = Math.atan2(wp.y - rotate.centerY, wp.x - rotate.centerX);
      const nextImage = containImageWithinBackground(
        {
          ...currentImage,
          rotation: rotate.startRotation + (pointerAngle - rotate.startPointerAngle),
        },
        getBackgroundImage(st.images),
      );
      st.updateImage(rotate.id, {
        x: nextImage.x,
        y: nextImage.y,
        rotation: nextImage.rotation,
      });
      return;
    }
    if (resizeImgRef.current) {
      const wp = screenToWorld(e.clientX, e.clientY);
      const resize = resizeImgRef.current;
      const currentImage = st.images.find((image) => image.id === resize.id);
      if (!currentImage) return;
      const background = getBackgroundImage(st.images);
      const local = rotateVector(wp.x - resize.centerX, wp.y - resize.centerY, -resize.rotation);
      const minScale = Math.max(0.08, 24 / resize.startWidth, 24 / resize.startHeight);
      const scale = Math.max(
        minScale,
        Math.abs(local.x) / Math.max(1, resize.startWidth / 2),
        Math.abs(local.y) / Math.max(1, resize.startHeight / 2),
      );
      const width = resize.startWidth * scale;
      const height = resize.startHeight * scale;
      const x = resize.centerX - width / 2;
      const y = resize.centerY - height / 2;
      const nextImage = containImageWithinBackground(
        { ...currentImage, x, y, width, height, rotation: resize.rotation },
        background,
      );

      if (!resize.historyCaptured) {
        st.pushHistory();
        resize.historyCaptured = true;
      }

      st.updateImage(resize.id, {
        x: nextImage.x,
        y: nextImage.y,
        width: nextImage.width,
        height: nextImage.height,
      });
      return;
    }
    if (dragImgRef.current) {
      const t = st.transform;
      const currentImage = st.images.find((image) => image.id === dragImgRef.current?.id);
      if (!currentImage) return;
      const dx = (e.clientX - dragImgRef.current.startX) / t.scale;
      const dy = (e.clientY - dragImgRef.current.startY) / t.scale;
      if (!dragImgRef.current.historyCaptured && (dx !== 0 || dy !== 0)) {
        st.pushHistory();
        dragImgRef.current.historyCaptured = true;
      }
      const nextImage = containImageWithinBackground(
        {
          ...currentImage,
          x: dragImgRef.current.imgX + dx,
          y: dragImgRef.current.imgY + dy,
        },
        getBackgroundImage(st.images),
      );
      st.updateImage(dragImgRef.current.id, { x: nextImage.x, y: nextImage.y });
      return;
    }
    if (drawingRef.current) {
      const wp = clampPointToImage(
        screenToWorld(e.clientX, e.clientY),
        getBackgroundImage(st.images),
      );
      st.extendStroke(drawingRef.current.id, wp);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }

    if (!touchGestureRef.current) {
      clearInteractionState();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;

    e.preventDefault();
    clearInteractionState();
    syncTouchGesture(e.touches);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;

    e.preventDefault();
    clearInteractionState();
    syncTouchGesture(e.touches);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      syncTouchGesture(e.touches);
      return;
    }

    touchGestureRef.current = null;
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
        ? hoveredHandle === "nw" || hoveredHandle === "se"
          ? "nwse-resize"
          : hoveredHandle === "ne" || hoveredHandle === "sw"
            ? "nesw-resize"
            : hoveredHandle === "rotate"
              ? "grab"
              : "default"
        : getDrawCursor(s.tool, s.color);

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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    />
  );
}
