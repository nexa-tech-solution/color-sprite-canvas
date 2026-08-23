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

type ExportOutcome = "saved" | "ready-to-save" | "cancelled" | "failed";
type ExportPreview = Window | null | undefined;

/**
 * Reserve a tab while the Export button's user gesture is still active. iOS
 * Safari blocks windows opened after the canvas has finished rendering, which
 * meant the previous async fallback could never show the exported image.
 */
export function prepareMobileExportPreview(): ExportPreview {
  if (!prefersShareSheet()) return null;

  return window.open("", "_blank");
}

function closeExportPreview(preview: ExportPreview) {
  if (preview && !preview.closed) preview.close();
}

function showImageForSaving(blob: Blob, filename: string, preview: ExportPreview): ExportOutcome {
  const url = URL.createObjectURL(blob);

  // This tab was opened directly by the export button, so mobile browsers permit
  // us to populate it after the async canvas work is done. Android's image
  // viewer does not reliably expose a save action, so it gets a direct download
  // link. iOS retains its existing image view for long press / Share.
  if (preview && !preview.closed) {
    if (!/Android/i.test(navigator.userAgent)) {
      preview.location.replace(url);
    } else {
      const document = preview.document;
      document.title = "My coloring";
      document.body.replaceChildren();

      const container = document.createElement("main");
      const download = document.createElement("a");
      const image = document.createElement("img");

      container.style.cssText =
        "min-height:100vh;box-sizing:border-box;display:grid;place-items:center;gap:16px;padding:24px;background:#fcfcfc;font-family:system-ui,sans-serif;";
      download.href = url;
      download.download = filename;
      download.textContent = "Download image";
      download.style.cssText =
        "padding:12px 18px;border-radius:999px;background:#6d28d9;color:#fff;font-weight:700;text-decoration:none;";
      image.src = url;
      image.alt = "Your exported coloring";
      image.style.cssText = "max-width:100%;max-height:calc(100vh - 110px);object-fit:contain;";

      container.append(download, image);
      document.body.append(container);
    }
  } else {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  // Keep the URL alive while the image is open. Revoking it immediately can
  // leave a blank page on Mobile Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  return "ready-to-save";
}

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

async function saveExport(
  blob: Blob,
  filename: string,
  preview: ExportPreview,
): Promise<ExportOutcome> {
  // Only jump straight to the shell when it has told us it handles SAVE_IMAGE.
  // Otherwise the round trip burns the user gesture that WKWebView needs for
  // navigator.share, which would break iOS on shells that never answer.
  if (shellSavesImages()) {
    const outcome =
      (await saveViaShell(blob, filename)) ?? (await shareFile(blob, filename)) ?? "failed";
    if (outcome !== "failed") closeExportPreview(preview);
    if (outcome !== "failed") return outcome;

    // Some Android shells advertise SAVE_IMAGE before their native handler is
    // ready (or do not have storage access). Do not stop at that failure: the
    // user can still download from the browser fallback we reserved on tap.
    if (prefersShareSheet()) return showImageForSaving(blob, filename, preview);

    return "failed";
  }

  const shared = await shareFile(blob, filename);
  if (shared) {
    closeExportPreview(preview);
    return shared;
  }

  // No share sheet: inside a shell that is the only remaining route (Android
  // WebView cannot download at all), so it is worth the wait even unannounced.
  const savedNatively = await saveViaShell(blob, filename);
  if (savedNatively) {
    closeExportPreview(preview);
    return savedNatively;
  }

  if (prefersShareSheet()) return showImageForSaving(blob, filename, preview);

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

export async function exportCanvas(preview?: ExportPreview) {
  const state = usePaintStore.getState();
  const { strokes, images } = state;

  if (!strokes.length && !images.length) {
    closeExportPreview(preview);
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
    const outcome = await saveExport(await canvasToBlob(canvas), filename, preview);

    if (outcome === "saved") toast.success("Exported!");
    if (outcome === "ready-to-save")
      toast.message("Your image is ready. Use the browser's Save Image or Share option.");
    if (outcome === "failed")
      toast.error("Could not save the image. Please update the app and try again.");
  } catch {
    closeExportPreview(preview);
    toast.error("Export failed. Please try again.");
  }
}
