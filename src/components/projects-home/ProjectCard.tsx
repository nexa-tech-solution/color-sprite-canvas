import { Link } from "@tanstack/react-router";
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
import { BookOpen, PenLine, Sparkles, Star, Trash2 } from "lucide-react";
import { deleteProject, toggleProjectFavorite, type PaintProject } from "@/lib/projects";
import { formatProjectDate, getProjectMetrics } from "./utils";
import { ProjectThumbnail } from "./ProjectThumbnail";

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] bg-white/78 px-3 py-2 shadow-[0_14px_24px_-22px_rgba(80,96,140,0.38)]">
      <div className="flex items-center gap-1.5 text-[#5a6a8d]">
        <Icon className="size-3.5 text-[#6ab2ff]" />
        <span className="text-xs font-bold sm:text-sm">{value}</span>
      </div>
      <div className="mt-1 text-[10px] font-medium text-[#98a3bc] sm:text-[11px]">{label}</div>
    </div>
  );
}

export function ProjectCard({ project }: { project: PaintProject }) {
  const metrics = getProjectMetrics(project);

  return (
    <article
      className={`group relative overflow-hidden rounded-[30px] border border-white/90 p-3 shadow-soft backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-float ${metrics.theme.shell}`}
    >
      <div className="absolute left-3 top-3 z-10">
        <button
          type="button"
          aria-label={
            project.isFavorite
              ? `Remove ${project.name} from favorites`
              : `Add ${project.name} to favorites`
          }
          aria-pressed={Boolean(project.isFavorite)}
          title={project.isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => toggleProjectFavorite(project.id)}
          className={`flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc83d] focus-visible:ring-offset-2 ${
            project.isFavorite
              ? "bg-[#fff0ad] hover:bg-[#ffe994]"
              : "bg-[#fff7d6] hover:bg-[#fff0b8]"
          }`}
        >
          <Star
            className={`size-4 transition-colors ${
              project.isFavorite ? "fill-[#ffc83d] text-[#ffc83d]" : "text-[#e7aa00]"
            }`}
          />
        </button>
      </div>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          aria-label={`Edit ${project.name}`}
          title={`Edit ${project.name}`}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#edf7ff] text-[#55a9ff] shadow-[0_16px_28px_-22px_rgba(85,169,255,0.5)] transition-colors hover:bg-[#dff1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b2ff] focus-visible:ring-offset-2"
        >
          <PenLine className="size-4" />
        </Link>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label={`Delete ${project.name}`}
              title={`Delete ${project.name}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#fff1f3] text-[#ff6079] shadow-[0_16px_28px_-22px_rgba(255,96,121,0.48)] transition-colors hover:bg-[#ffe2e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a83] focus-visible:ring-offset-2"
            >
              <Trash2 className="size-4" />
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
                This will permanently delete "{project.name}" from your gallery. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
              <AlertDialogCancel className="mt-0 rounded-[14px] border-0 bg-[#f1f4f8] px-4 py-2 text-sm font-semibold text-[#667a9c] shadow-none hover:bg-[#e8edf5] hover:text-[#17243a]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProject(project.id)}
                className="rounded-[14px] bg-[#ff6a83] px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-[#f04f6d]"
              >
                Delete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="flex h-full flex-col"
      >
        <ProjectThumbnail project={project} />

        <div className="mt-4 min-w-0 px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[1.3rem] font-bold tracking-[-0.04em] text-[#27304d] sm:text-[1.45rem]">
                {project.name}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-[#8390ac] sm:text-xs">
                Updated {formatProjectDate(project.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatPill icon={BookOpen} label="Pages" value={metrics.coloringPageCount} />
          <StatPill icon={Sparkles} label="Stickers" value={metrics.stickerCount} />
          <StatPill icon={PenLine} label="Colors" value={metrics.strokeCount} />
        </div>

        <div className="mt-4 rounded-[20px] bg-white/80 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm">
            <span className="text-[#55617d]">{metrics.statusLabel}</span>
            <span className="text-[#25314f]">{metrics.progressLabel}</span>
          </div>
          <div className={`mt-3 h-3 rounded-full ${metrics.theme.progressTrack}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${metrics.theme.progress}`}
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
