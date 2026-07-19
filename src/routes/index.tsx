import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ImageIcon, PenLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createProject,
  deleteProject,
  listProjects,
  PROJECTS_CHANGED_EVENT,
  type PaintProject,
} from "@/lib/projects";

export const Route = createFileRoute("/")({
  component: ProjectsHome,
});

function ProjectsHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<PaintProject[]>([]);

  useEffect(() => {
    setMounted(true);

    const syncProjects = () => setProjects(listProjects());
    syncProjects();

    window.addEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
    window.addEventListener("storage", syncProjects);
    window.addEventListener("focus", syncProjects);

    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
      window.removeEventListener("storage", syncProjects);
      window.removeEventListener("focus", syncProjects);
    };
  }, []);

  const handleCreateProject = () => {
    const project = createProject({
      name: `Sketch ${projects.length + 1}`,
    });

    navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id },
    });
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#fbfcfe] text-slate-500">
        <div className="text-sm font-medium">Loading projects…</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#fbfcfe] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,_rgba(255,218,233,0.72),_transparent_28%),radial-gradient(circle_at_94%_5%,_rgba(212,241,244,0.65),_transparent_26%)]" />
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-70" />

      <section className="relative mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 mt-10">
        <header className="min-h-[250px] rounded-[32px] border border-white/90 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8 lg:p-9">
          <div className="w-full">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe9df] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#71819e]">
              <Sparkles className="size-3" />
              Project library
            </div>

            <h1 className="mt-3.5 text-[36px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#17243a] sm:text-[46px]">
              Every canvas in one cozy place.
            </h1>

            <p className="mt-2.5 text-[13px] leading-relaxed text-[#697b9a] sm:text-[15px]">
              Open a saved sketch, rename it from the editor header, and keep building without
              losing the thread between ideas.
            </p>

            <button
              onClick={handleCreateProject}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-[15px] bg-[#17243a] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_12px_24px_-16px_rgba(23,36,58,0.65)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="size-3.5" />
              New project
            </button>
          </div>
        </header>

        {projects.length === 0 ? (
          <EmptyLibrary onCreateProject={handleCreateProject} />
        ) : (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyLibrary({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="mt-9 flex min-h-[244px] flex-col items-center justify-center rounded-[32px] border border-white/90 bg-white/88 px-5 py-8 text-center shadow-soft backdrop-blur-sm">
      <div className="flex size-10 items-center justify-center rounded-[14px] bg-[#ffe8f1] text-pink-500">
        <PenLine className="size-[18px]" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#17243a]">
        Your first canvas starts here.
      </h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#697b9a]">
        Create a project and it will stay ready for your next drawing session.
      </p>
      <button
        onClick={onCreateProject}
        className="mt-5 inline-flex items-center gap-2 rounded-[15px] bg-[#17243a] px-5 py-2.5 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <Plus className="size-3.5" />
        New project
      </button>
    </section>
  );
}

function ProjectCard({ project }: { project: PaintProject }) {
  const importedImageCount = project.images.filter((image) => image.kind !== "sticker").length;
  const stickerCount = project.images.filter((image) => image.kind === "sticker").length;

  return (
    <article className="group relative min-h-[244px] rounded-[32px] border border-white/90 bg-white/92 p-5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float">
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="flex h-full flex-col"
      >
        <div className="flex items-start">
          <div className="flex size-10 items-center justify-center rounded-[14px] bg-[#ffe8f1] text-pink-500">
            <PenLine className="size-[18px]" />
          </div>
        </div>

        <ProjectThumbnail project={project} />

        <div className="mt-4 min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-[-0.045em] text-[#17243a]">
            {project.name}
          </h2>
          <p className="mt-1 text-[11px] text-[#7385a3]">
            Updated {formatProjectDate(project.updatedAt)}
          </p>
        </div>

        <div className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,_#fff0ec_0%,_#f3edff_52%,_#eaf7fb_100%)] px-3.5 py-3 text-[#667a9c]">
          <div className="flex items-center gap-2 text-xs">
            <ImageIcon className="size-4 shrink-0" />
            <span>{formatCount(importedImageCount, "imported image")}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Sparkles className="size-4 shrink-0" />
            <span>{formatCount(stickerCount, "sticker")}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <PenLine className="size-4 shrink-0" />
            <span>{formatCount(project.strokes.length, "stroke")}</span>
          </div>
        </div>
      </Link>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label={`Delete ${project.name}`}
            title={`Delete ${project.name}`}
            className="absolute right-5 top-5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-[#fff1f1] text-[#d66b73] transition-colors hover:bg-[#ffe3e5] hover:text-[#b7444e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d66b73]"
          >
            <Trash2 className="size-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[calc(100%-32px)] max-w-[380px] rounded-[28px] border border-white/90 bg-white/95 p-5 text-[#17243a] shadow-[0_28px_70px_-36px_rgba(23,36,58,0.65)] backdrop-blur-md sm:rounded-[28px]">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex size-10 items-center justify-center rounded-[15px] bg-[#fff1f1] text-[#d66b73]">
              <Trash2 className="size-5" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold tracking-normal text-[#17243a]">
              Delete project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-[#697b9a]">
              This will permanently delete "{project.name}" from your project library. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 rounded-[14px] border-0 bg-[#f1f4f8] px-4 py-2 text-sm font-semibold text-[#667a9c] shadow-none hover:bg-[#e8edf5] hover:text-[#17243a]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProject(project.id)}
              className="rounded-[14px] bg-[#d66b73] px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-[#bd505a]"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function ProjectThumbnail({ project }: { project: PaintProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasContent = project.images.length > 0 || project.strokes.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    let cancelled = false;

    const drawThumbnail = async () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = 600;
      const height = 320;
      canvas.width = width;
      canvas.height = height;

      const bounds = getProjectBounds(project);
      const scale = Math.min((width - 48) / bounds.width, (height - 48) / bounds.height);
      const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
      const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;
      const loadedImages = await Promise.all(
        project.images.map(async (image) => ({
          id: image.id,
          element: await loadThumbnailImage(image.src),
        })),
      );

      if (cancelled) return;

      const imageElements = new Map(
        loadedImages
          .filter((entry) => entry.element !== null)
          .map((entry) => [entry.id, entry.element!]),
      );

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);

      drawThumbnailImages(
        context,
        project.images.filter((image) => !image.isOutline && image.kind !== "sticker"),
        imageElements,
      );
      drawThumbnailStrokes(context, project);
      drawThumbnailImages(
        context,
        project.images.filter((image) => image.isOutline && image.kind !== "sticker"),
        imageElements,
        true,
      );
      drawThumbnailImages(
        context,
        project.images.filter((image) => image.kind === "sticker"),
        imageElements,
      );

      context.restore();
    };

    void drawThumbnail();

    return () => {
      cancelled = true;
    };
  }, [hasContent, project]);

  return (
    <div className="relative mt-4 aspect-[15/8] overflow-hidden rounded-[18px] border border-white/80 bg-[linear-gradient(135deg,_#fff8f6,_#f6f3ff_52%,_#eff9fb)]">
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
  );
}

function getProjectBounds(project: PaintProject) {
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

function loadThumbnailImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawThumbnailImages(
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

function drawThumbnailStrokes(context: CanvasRenderingContext2D, project: PaintProject) {
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

function formatCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatProjectDate(value: string) {
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
