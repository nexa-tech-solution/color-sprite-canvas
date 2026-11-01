import type { Stroke } from "./projects";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draw one stroke onto a context that is already in world coordinates.
 * Used by the live canvas, export, thumbnails and progress analysis so every
 * surface renders strokes identically (including single-tap dots).
 */
export function drawStroke(ctx: Ctx, stroke: Stroke) {
  const points = stroke.points;
  if (points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = stroke.tool === "eraser" ? 1 : stroke.opacity;
  ctx.globalCompositeOperation =
    stroke.tool === "eraser"
      ? "destination-out"
      : stroke.tool === "marker"
        ? "multiply"
        : "source-over";
  const color = stroke.tool === "eraser" ? "#000" : stroke.color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.size;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const point = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

export function drawStrokes(ctx: Ctx, strokes: readonly Stroke[]) {
  for (const stroke of strokes) drawStroke(ctx, stroke);
}

/**
 * Render strokes onto their own transparent layer so the eraser only removes
 * paint — never the white page, the photo background or the outline.
 */
export function renderStrokeLayer(
  width: number,
  height: number,
  applyTransform: (ctx: CanvasRenderingContext2D) => void,
  strokes: readonly Stroke[],
) {
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(width));
  layer.height = Math.max(1, Math.round(height));
  const ctx = layer.getContext("2d");
  if (!ctx) return layer;
  applyTransform(ctx);
  drawStrokes(ctx, strokes);
  return layer;
}
