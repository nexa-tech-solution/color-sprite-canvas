import { toast } from "sonner";
import { coloringPageToSrc, type ColoringPage } from "@/lib/coloringPages";
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

  const url = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${PAINT_ACTIONS.exportFilePrefix}-${Date.now()}.png`;
  anchor.click();
  toast.success("Exported!");
}
