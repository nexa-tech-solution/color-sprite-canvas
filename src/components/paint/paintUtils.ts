import { toast } from "sonner";
import { coloringPageToSrc, type ColoringPage } from "@/lib/coloringPages";
import { isNativeShell, saveImageNative, shellSavesImages } from "@/lib/nativeBridge";
import { usePaintStore, type CanvasImage } from "@/stores/paintStore";
import { PAINT_ACTIONS } from "./paintConstants";

export function stopControlEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function waitLoad(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function scaleIntoPage(width: number, height: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / width);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export async function buildImportedBackground(src: string) {
  const img = await loadImg(src);
  const size = scaleIntoPage(img.width, img.height, 760);

  return {
    id: crypto.randomUUID(),
    src,
    originalSrc: src,
    kind: "image" as const,
    isOutline: false,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    opacity: 1,
  };
}

export async function buildColoringBookBackground(page: ColoringPage) {
  const src = coloringPageToSrc(page);
  const img = await loadImg(src);
  const size = scaleIntoPage(page.width ?? img.width, page.height ?? img.height, 760);

  return {
    id: crypto.randomUUID(),
    src,
    originalSrc: src,
    kind: "coloring-page" as const,
    isOutline: true,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    opacity: 1,
  };
}

export function getBackgroundImage(images: CanvasImage[]) {
  return images.find((image) => image.kind !== "sticker") ?? null;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas image could not be created"));
    }, "image/png");
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Image could not be encoded"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Android's WebView ignores the `download` attribute and refuses to hand `blob:`
 * URLs to the download manager, so the anchor below silently does nothing there.
 * Only the native shell can save a file on that platform.
 */
function anchorDownloadIsUseless() {
  return isNativeShell() && /android/i.test(navigator.userAgent);
}

/**
 * The share sheet is the right answer on phones and tablets, where a plain
 * download either fails or drops the file somewhere the user cannot find.
 * Desktops have a real download flow, so they should not get a share popup —
 * even though macOS Safari and Windows Chrome both expose `navigator.share`.
 */
function prefersShareSheet() {
  const ua = navigator.userAgent;
  const isTouchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS

  return /Android|iPhone|iPad|iPod/i.test(ua) || isTouchMac;
}

type ExportOutcome = "saved" | "cancelled" | "failed";

async function shareFile(blob: Blob, filename: string): Promise<ExportOutcome | null> {
  const file = new File([blob], filename, { type: "image/png" });

  // Mobile browsers do not consistently honour an anchor download, especially
  // when it originates in an embedded WebView. Prefer their native share sheet.
  if (
    !prefersShareSheet() ||
    !navigator.share ||
    (navigator.canShare && !navigator.canShare({ files: [file] }))
  ) {
    return null;
  }

  try {
    await navigator.share({ files: [file], title: "My coloring" });
    return "saved";
  } catch (error) {
    // A dismissed share sheet is not an export failure. Anything else (most
    // often a lapsed user gesture) leaves the caller to try another route.
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return null;
  }
}

async function saveViaShell(blob: Blob, filename: string): Promise<ExportOutcome | null> {
  if (!isNativeShell()) return null;

  const outcome = await saveImageNative({ filename, dataUrl: await blobToDataUrl(blob) });
  if (outcome === "saved") return "saved";
  if (outcome === "cancelled") return "cancelled";

  return null; // Shell predates the SAVE_IMAGE handler.
}

async function saveExport(blob: Blob, filename: string): Promise<ExportOutcome> {
  // Only jump straight to the shell when it has told us it handles SAVE_IMAGE.
  // Otherwise the round trip burns the user gesture that WKWebView needs for
  // navigator.share, which would break iOS on shells that never answer.
  if (shellSavesImages()) {
    return (await saveViaShell(blob, filename)) ?? (await shareFile(blob, filename)) ?? "failed";
  }

  const shared = await shareFile(blob, filename);
  if (shared) return shared;

  // No share sheet: inside a shell that is the only remaining route (Android
  // WebView cannot download at all), so it is worth the wait even unannounced.
  const savedNatively = await saveViaShell(blob, filename);
  if (savedNatively) return savedNatively;

  if (anchorDownloadIsUseless()) return "failed";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return "saved";
}

export async function exportCanvas() {
  const state = usePaintStore.getState();
  const { strokes, images } = state;

  if (!strokes.length && !images.length) {
    toast.error("Nothing to export yet - draw something first!");
    return;
  }

  const background = getBackgroundImage(images);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (background) {
    minX = background.x;
    minY = background.y;
    maxX = background.x + background.width;
    maxY = background.y + background.height;
  } else {
    for (const image of images) {
      minX = Math.min(minX, image.x);
      minY = Math.min(minY, image.y);
      maxX = Math.max(maxX, image.x + image.width);
      maxY = Math.max(maxY, image.y + image.height);
    }

    for (const stroke of strokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x - stroke.size);
        minY = Math.min(minY, point.y - stroke.size);
        maxX = Math.max(maxX, point.x + stroke.size);
        maxY = Math.max(maxY, point.y + stroke.size);
      }
    }

    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(4096, Math.round(width));
  canvas.height = Math.min(4096, Math.round(height));

  const scaleFactor = canvas.width / width;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    toast.error("Export failed. Please try again.");
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(-minX * scaleFactor, -minY * scaleFactor);
  ctx.scale(scaleFactor, scaleFactor);

  const backgrounds = images.filter((image) => !image.isOutline && image.kind !== "sticker");
  const outlines = images.filter((image) => image.isOutline && image.kind !== "sticker");
  const stickers = images.filter((image) => image.kind === "sticker");

  await Promise.all(images.map((image) => waitLoad(image.src)));

  if (background) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(background.x, background.y, background.width, background.height);
    ctx.clip();
  }

  for (const image of backgrounds) {
    const loaded = await waitLoad(image.src);
    ctx.globalAlpha = image.opacity;
    ctx.drawImage(loaded, image.x, image.y, image.width, image.height);
  }

  ctx.globalAlpha = 1;

  for (const stroke of strokes) {
    ctx.globalAlpha = stroke.opacity;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
    } else {
      ctx.globalCompositeOperation = stroke.tool === "marker" ? "multiply" : "source-over";
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    if (stroke.points.length) {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    }
    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const midX = (stroke.points[index].x + stroke.points[index + 1].x) / 2;
      const midY = (stroke.points[index].y + stroke.points[index + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[index].x, stroke.points[index].y, midX, midY);
    }
    if (stroke.points.length > 1) {
      const lastPoint = stroke.points.at(-1);
      if (lastPoint) {
        ctx.lineTo(lastPoint.x, lastPoint.y);
      }
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  for (const image of outlines) {
    const loaded = await waitLoad(image.src);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(loaded, image.x, image.y, image.width, image.height);
  }

  if (background) {
    ctx.restore();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  for (const image of stickers) {
    const loaded = await waitLoad(image.src);
    ctx.globalAlpha = image.opacity;
    ctx.drawImage(loaded, image.x, image.y, image.width, image.height);
  }

  try {
    const filename = `${PAINT_ACTIONS.exportFilePrefix}-${Date.now()}.png`;
    const outcome = await saveExport(await canvasToBlob(canvas), filename);

    if (outcome === "saved") toast.success("Exported!");
    if (outcome === "failed")
      toast.error("Could not save the image. Please update the app and try again.");
  } catch {
    toast.error("Export failed. Please try again.");
  }
}
