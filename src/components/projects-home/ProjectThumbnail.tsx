import { useEffect, useRef } from "react";
import type { PaintProject } from "@/lib/projects";
import {
  drawThumbnailImages,
  drawThumbnailStrokes,
  getProjectBounds,
  loadThumbnailImage,
} from "./utils";

function drawFreeCanvasBackdrop(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#fdfdff");
  gradient.addColorStop(1, "#f7faff");

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(191, 203, 227, 0.58)";
  for (let y = 18; y < height; y += 26) {
    for (let x = 18; x < width; x += 26) {
      context.beginPath();
      context.arc(x, y, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }
}

export function ProjectThumbnail({ project }: { project: PaintProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;

  const hasContent = project.images.length > 0 || project.strokes.length > 0;
  const hasBackgroundImage = project.images.some((image) => image.kind !== "sticker");
  const isFreeCanvasProject = !hasBackgroundImage;
  const thumbnailRevision = project.updatedAt;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const thumbnailProject = projectRef.current;
    let cancelled = false;

    const drawThumbnail = async () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = 560;
      const height = 560;
      canvas.width = width;
      canvas.height = height;

      const bounds = getProjectBounds(thumbnailProject);
      const scale = Math.min((width - 68) / bounds.width, (height - 68) / bounds.height);
      const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
      const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

      const loadedImages = await Promise.all(
        thumbnailProject.images.map(async (image) => ({
          id: image.id,
          element: await loadThumbnailImage(image.src, image.originalSrc),
        })),
      );

      if (cancelled) return;

      const imageElements = new Map(
        loadedImages
          .filter((entry) => entry.element !== null)
          .map((entry) => [entry.id, entry.element!]),
      );

      context.clearRect(0, 0, width, height);
      if (isFreeCanvasProject) {
        drawFreeCanvasBackdrop(context, width, height);
      } else {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }

      if (!hasContent) {
        return;
      }

      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);

      drawThumbnailImages(
        context,
        thumbnailProject.images.filter((image) => !image.isOutline && image.kind !== "sticker"),
        imageElements,
      );
      drawThumbnailStrokes(context, thumbnailProject);
      drawThumbnailImages(
        context,
        thumbnailProject.images.filter((image) => image.isOutline && image.kind !== "sticker"),
        imageElements,
        true,
      );
      drawThumbnailImages(
        context,
        thumbnailProject.images.filter((image) => image.kind === "sticker"),
        imageElements,
      );

      context.restore();
    };

    void drawThumbnail();

    return () => {
      cancelled = true;
    };
  }, [hasContent, isFreeCanvasProject, thumbnailRevision]);

  return (
    <div className="relative aspect-[1/1] overflow-hidden">
      <div className="absolute inset-x-7 bottom-4 h-5 rounded-full bg-[#dbe6f8]/55 blur-md" />

      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_20px_35px_-28px_rgba(83,105,155,0.42)]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Thumbnail of ${project.name}`}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
