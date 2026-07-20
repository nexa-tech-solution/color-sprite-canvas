import { PenLine } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PaintProject } from "@/lib/projects";
import {
  drawThumbnailImages,
  drawThumbnailStrokes,
  getProjectBounds,
  loadThumbnailImage,
} from "./utils";

export function ProjectThumbnail({ project }: { project: PaintProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;

  const hasContent = project.images.length > 0 || project.strokes.length > 0;
  const thumbnailRevision = project.updatedAt;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

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
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
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
  }, [hasContent, thumbnailRevision]);

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
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center text-[#a4b1c7]">
            <PenLine className="size-5 opacity-70" />
          </div>
        )}
      </div>
    </div>
  );
}
