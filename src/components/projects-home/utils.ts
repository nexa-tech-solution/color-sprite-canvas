import type { PaintProject } from "@/lib/projects";
import { renderStrokeLayer } from "@/lib/strokeRender";
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
    const rotation = image.rotation ?? 0;
    if (rotation) {
      context.translate(image.x + image.width / 2, image.y + image.height / 2);
      context.rotate(rotation);
      context.drawImage(element, -image.width / 2, -image.height / 2, image.width, image.height);
    } else {
      context.drawImage(element, image.x, image.y, image.width, image.height);
    }
    context.restore();
  }
}

export function drawThumbnailStrokes(context: CanvasRenderingContext2D, project: PaintProject) {
  // Draw on a separate layer so eraser strokes don't cut through the page.
  const { width, height } = context.canvas;
  const matrix = context.getTransform();
  const background = project.images.find((image) => image.kind !== "sticker");
  const layer = renderStrokeLayer(
    width,
    height,
    (layerCtx) => {
      layerCtx.setTransform(matrix);
      if (background) {
        layerCtx.beginPath();
        layerCtx.rect(background.x, background.y, background.width, background.height);
        layerCtx.clip();
      }
    },
    project.strokes,
  );
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(layer, 0, 0);
  context.restore();
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
    case "favorites":
      return project.isFavorite;
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

/** Kid-friendly relative time: "Just now", "Today", "Yesterday", "3 days ago". */
export function formatRelativeDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60_000) return "Just now";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.ceil((startOfToday.getTime() - date.getTime()) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatProjectDate(value);
}

/** A small, stable tilt so the gallery looks like pinned-up drawings. */
export function getCardTilt(id: string) {
  const tilts = [-1.6, 0.9, -0.7, 1.4, -1.1, 0.5];
  return tilts[hashString(id) % tilts.length];
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
