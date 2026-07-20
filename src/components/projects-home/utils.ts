import type { PaintProject } from "@/lib/projects";
import { cardThemes, type ProjectFilter, type ProjectSort } from "./constants";

export function getProjectBounds(project: PaintProject) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const image of project.images) {
    minX = Math.min(minX, image.x);
    minY = Math.min(minY, image.y);
    maxX = Math.max(maxX, image.x + image.width);
    maxY = Math.max(maxY, image.y + image.height);
  }

  for (const stroke of project.strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x - stroke.size);
      minY = Math.min(minY, point.y - stroke.size);
      maxX = Math.max(maxX, point.x + stroke.size);
      maxY = Math.max(maxY, point.y + stroke.size);
    }
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return { minX: 0, minY: 0, width: 1, height: 1 };
  }

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export async function loadThumbnailImage(src: string, fallbackSrc?: string) {
  const sources = [src, fallbackSrc].filter(Boolean) as string[];

  for (const candidate of sources) {
    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = candidate;
    });

    if (loaded) {
      return loaded;
    }
  }

  return null;
}

export function drawThumbnailImages(
  context: CanvasRenderingContext2D,
  images: PaintProject["images"],
  imageElements: Map<string, HTMLImageElement>,
  multiply = false,
) {
  for (const image of images) {
    const element = imageElements.get(image.id);
    if (!element) continue;

    context.save();
    context.globalAlpha = image.opacity;
    context.globalCompositeOperation = multiply ? "multiply" : "source-over";
    context.drawImage(element, image.x, image.y, image.width, image.height);
    context.restore();
  }
}

export function drawThumbnailStrokes(context: CanvasRenderingContext2D, project: PaintProject) {
  for (const stroke of project.strokes) {
    if (stroke.points.length === 0) continue;

    context.save();
    context.globalAlpha = stroke.opacity;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size;
    context.globalCompositeOperation =
      stroke.tool === "eraser"
        ? "destination-out"
        : stroke.tool === "marker"
          ? "multiply"
          : "source-over";
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;

    if (stroke.points.length === 1) {
      const [point] = stroke.points;
      context.beginPath();
      context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
      continue;
    }

    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const point = stroke.points[index];
      const nextPoint = stroke.points[index + 1];
      const middleX = (point.x + nextPoint.x) / 2;
      const middleY = (point.y + nextPoint.y) / 2;
      context.quadraticCurveTo(point.x, point.y, middleX, middleY);
    }

    const lastPoint = stroke.points.at(-1)!;
    context.lineTo(lastPoint.x, lastPoint.y);
    context.stroke();
    context.restore();
  }
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getProjectMetrics(project: PaintProject) {
  const importedImageCount = project.images.filter(
    (image) => image.kind !== "sticker" && image.kind !== "coloring-page",
  ).length;
  const coloringPageCount = project.images.filter((image) => image.kind === "coloring-page").length;
  const stickerCount = project.images.filter((image) => image.kind === "sticker").length;
  const strokeCount = project.strokes.length;
  const hasContent = project.images.length > 0 || strokeCount > 0;

  const rawProgress =
    coloringPageCount * 24 +
    importedImageCount * 18 +
    Math.min(26, stickerCount * 4) +
    Math.min(42, strokeCount * 4);

  const fallbackProgress = hasContent ? Math.min(100, Math.max(18, rawProgress)) : 0;
  const progress = Number.isFinite(project.progress)
    ? Math.min(100, Math.max(0, Math.round(project.progress!)))
    : fallbackProgress;
  const theme = cardThemes[hashString(project.id) % cardThemes.length];

  return {
    importedImageCount,
    coloringPageCount,
    stickerCount,
    strokeCount,
    progress,
    theme,
    progressLabel: progress >= 100 ? "100%" : `${progress}%`,
    statusLabel:
      progress >= 90
        ? "Finished"
        : progress >= 70
          ? "Almost done"
          : progress >= 40
            ? "Looking bright"
            : "Just started",
  };
}

export function matchesFilter(project: PaintProject, filter: ProjectFilter) {
  const metrics = getProjectMetrics(project);
  const updatedAt = new Date(project.updatedAt).getTime();
  const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;

  switch (filter) {
    case "recent":
      return Number.isFinite(updatedAt) && updatedAt >= threeDaysAgo;
    case "pages":
      return metrics.coloringPageCount > 0 || metrics.importedImageCount > 0;
    case "stickers":
      return metrics.stickerCount > 0;
    case "finished":
      return metrics.progress >= 90;
    case "all":
    default:
      return true;
  }
}

export function sortProjects(projects: PaintProject[], sort: ProjectSort) {
  return [...projects].sort((firstProject, secondProject) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(firstProject.updatedAt).getTime() - new Date(secondProject.updatedAt).getTime()
        );
      case "name-asc":
        return firstProject.name.localeCompare(secondProject.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      case "name-desc":
        return secondProject.name.localeCompare(firstProject.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      case "newest":
      default:
        return (
          new Date(secondProject.updatedAt).getTime() - new Date(firstProject.updatedAt).getTime()
        );
    }
  });
}

export function formatProjectDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
