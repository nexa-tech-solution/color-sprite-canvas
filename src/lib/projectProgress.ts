import type { PaintProject, Stroke } from "./projects";

const ANALYSIS_SIZE = 256;
const DARK_PIXEL_THRESHOLD = 205;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;

  context.save();
  context.globalAlpha = stroke.opacity;
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.size;

  if (stroke.points.length === 1) {
    const [point] = stroke.points;
    context.beginPath();
    context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let index = 1; index < stroke.points.length - 1; index += 1) {
    const point = stroke.points[index];
    const nextPoint = stroke.points[index + 1];
    context.quadraticCurveTo(
      point.x,
      point.y,
      (point.x + nextPoint.x) / 2,
      (point.y + nextPoint.y) / 2,
    );
  }

  const lastPoint = stroke.points.at(-1)!;
  context.lineTo(lastPoint.x, lastPoint.y);
  context.stroke();
  context.restore();
}

function dilateBarrier(barrier: Uint8Array, width: number, height: number) {
  const dilated = barrier.slice();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!barrier[index]) continue;

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
            dilated[nextY * width + nextX] = 1;
          }
        }
      }
    }
  }

  return dilated;
}

function findExteriorPixels(barrier: Uint8Array, width: number, height: number) {
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    const index = y * width + x;
    if (barrier[index] || exterior[index]) return;
    exterior[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  return exterior;
}

async function buildColorableMask(project: PaintProject, width: number, height: number) {
  const background = project.images.find((image) => image.kind === "coloring-page");
  const mask = new Uint8Array(width * height);

  if (!background) {
    mask.fill(1);
    return mask;
  }

  const image = await loadImage(background.src || background.originalSrc);
  if (!image) {
    mask.fill(1);
    return mask;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    mask.fill(1);
    return mask;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  try {
    const pixels = context.getImageData(0, 0, width, height).data;
    const barrier = new Uint8Array(width * height);

    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      const alpha = pixels[offset + 3];
      const luminance =
        pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
      barrier[index] = alpha > 24 && luminance < DARK_PIXEL_THRESHOLD ? 1 : 0;
    }

    const closedBarrier = dilateBarrier(barrier, width, height);
    const exterior = findExteriorPixels(closedBarrier, width, height);
    let colorablePixels = 0;

    for (let index = 0; index < mask.length; index += 1) {
      if (!closedBarrier[index] && !exterior[index]) {
        mask[index] = 1;
        colorablePixels += 1;
      }
    }

    // Some imported outlines contain open contours; use the page area rather than returning 0%.
    if (colorablePixels < width * height * 0.01) {
      for (let index = 0; index < mask.length; index += 1) {
        mask[index] = closedBarrier[index] ? 0 : 1;
      }
    }
  } catch {
    mask.fill(1);
  }

  return mask;
}

export async function calculateProjectProgress(project: PaintProject) {
  if (typeof document === "undefined" || project.strokes.length === 0) return 0;

  const background = project.images.find((image) => image.kind !== "sticker");
  if (!background || background.width <= 0 || background.height <= 0) return 0;

  const aspectRatio = background.width / background.height;
  const width = Math.max(
    1,
    Math.round(aspectRatio >= 1 ? ANALYSIS_SIZE : ANALYSIS_SIZE * aspectRatio),
  );
  const height = Math.max(
    1,
    Math.round(aspectRatio >= 1 ? ANALYSIS_SIZE / aspectRatio : ANALYSIS_SIZE),
  );
  const colorableMask = await buildColorableMask(project, width, height);

  const strokeCanvas = document.createElement("canvas");
  strokeCanvas.width = width;
  strokeCanvas.height = height;
  const strokeContext = strokeCanvas.getContext("2d", { willReadFrequently: true });
  if (!strokeContext) return 0;

  strokeContext.save();
  strokeContext.scale(width / background.width, height / background.height);
  strokeContext.translate(-background.x, -background.y);
  project.strokes.forEach((stroke) => drawStroke(strokeContext, stroke));
  strokeContext.restore();

  const strokePixels = strokeContext.getImageData(0, 0, width, height).data;
  let colorablePixels = 0;
  let coloredPixels = 0;

  for (let index = 0; index < colorableMask.length; index += 1) {
    if (!colorableMask[index]) continue;
    colorablePixels += 1;
    if (strokePixels[index * 4 + 3] > 12) coloredPixels += 1;
  }

  if (colorablePixels === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((coloredPixels / colorablePixels) * 100)));
}
