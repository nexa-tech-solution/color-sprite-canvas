import type { CSSProperties } from "react";
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
import { Star, Trash2, Trophy } from "lucide-react";
import type { MySubmission } from "@/lib/contests";
import { submissionImageUrl } from "@/lib/supabase";
import { KidChatButton } from "@/components/contest/KidChatButton";
import { deleteProject, toggleProjectFavorite, type PaintProject } from "@/lib/projects";
import { formatRelativeDay, getCardTilt, getProjectMetrics } from "./utils";
import { ProjectThumbnail } from "./ProjectThumbnail";

// Washi tape with torn, zig-zag ends.
const TAPE_CLIP =
  "polygon(0 12%, 5% 0, 95% 0, 100% 14%, 96% 32%, 100% 50%, 96% 68%, 100% 86%, 95% 100%, 5% 100%, 0 88%, 4% 70%, 0 50%, 4% 30%)";

function ProgressBar({
  progress,
  color,
  track,
}: {
  progress: number;
  color: string;
  track: string;
}) {
  return (
    <div
      className="h-2 flex-1 overflow-hidden rounded-full"
      style={{ background: track }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Coloring progress"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${progress}%`, background: color }}
      />
    </div>
  );
}

export function ProjectCard({
  project,
  submission,
}: {
  project: PaintProject;
  /** This device's sent entry, when the drawing is for a contest and was sent. */
  submission?: MySubmission;
}) {
  const metrics = getProjectMetrics(project);
  const { theme, progress } = metrics;
  const isDone = progress >= 90;
  const isNew = project.strokes.length === 0 && metrics.stickerCount === 0;
  const tilt = getCardTilt(project.id);

  return (
    <article
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
      className="group relative pt-3 transition-transform duration-300 ease-out [transform:rotate(var(--tilt))] active:[transform:rotate(0deg)_scale(0.97)] sm:hover:[transform:rotate(0deg)_translateY(-4px)]"
    >
      {/* Washi tape holding the drawing up. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-20 h-5 w-16 -translate-x-1/2 -rotate-3 opacity-90 mix-blend-multiply sm:h-6 sm:w-20"
        style={{
          clipPath: TAPE_CLIP,
          background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%), ${theme.tape}`,
        }}
      />

      <div className="relative rounded-[10px] bg-[#fffefb] p-2 pb-2.5 shadow-[0_1px_0_rgba(80,60,120,0.06),0_2px_4px_-2px_rgba(80,60,120,0.12),0_16px_28px_-18px_rgba(80,60,120,0.45)] ring-1 ring-[#efe9df] sm:p-3 sm:pb-3.5">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          aria-label={`Open ${project.name}`}
          className="block rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ "--tw-ring-color": theme.crayon } as CSSProperties}
        >
          <div className="relative">
            <ProjectThumbnail project={project} />

            {isDone && (
              <span
                className="absolute -bottom-2 -right-2 flex rotate-[10deg] items-center gap-1 rounded-full bg-[#ffd84d] px-2.5 py-1 font-display text-xs font-semibold text-[#7a4b00] shadow-[0_6px_12px_-6px_rgba(122,75,0,0.6)] ring-2 ring-white"
                aria-label="Finished"
              >
                <Star className="size-3 fill-current" />
                Done!
              </span>
            )}
            {project.contestId && (
              <span className="absolute left-1.5 top-1.5 inline-flex max-w-[calc(100%-3rem)] -rotate-2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 font-display text-[11px] font-semibold text-amber-950 shadow-sm ring-2 ring-white">
                <Trophy className="size-3 shrink-0" />
                {submission || project.submission ? "Sent" : "Contest"}
              </span>
            )}
            {isNew && (
              <span className="absolute bottom-2 left-2 -rotate-2 rounded-md bg-white/95 px-2 py-0.5 font-display text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-100">
                Ready to color
              </span>
            )}
          </div>

          <div className="mt-2 min-w-0 px-0.5 sm:mt-3">
            <h2 className="truncate font-display text-[15px] font-semibold leading-tight text-[#2a2f4a] sm:text-lg">
              {project.name}
            </h2>

            <div className="mt-2 flex items-center gap-2">
              <ProgressBar progress={progress} color={theme.crayon} track={theme.crayonTrack} />
              <span
                className="w-9 shrink-0 text-right font-display text-xs font-semibold tabular-nums"
                style={{ color: theme.ink }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </Link>

        <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#a19a8c] sm:text-xs">
            {formatRelativeDay(project.updatedAt)}
          </span>

          {submission && (
            <KidChatButton
              submissionId={submission.id}
              imageUrl={submissionImageUrl(submission.image_path, submission.updated_at)}
              variant="card"
            />
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`Delete ${project.name}`}
                title="Delete"
                className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#c4bcae] transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
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
                  Delete this drawing?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-[#697b9a]">
                  "{project.name}" will be removed from your gallery for good.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
                <AlertDialogCancel className="mt-0 rounded-[14px] border-0 bg-[#f1f4f8] px-4 py-2 text-sm font-semibold text-[#667a9c] shadow-none hover:bg-[#e8edf5] hover:text-[#17243a]">
                  Keep it
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteProject(project.id)}
                  className="rounded-[14px] bg-[#ff6a83] px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-[#f04f6d]"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Favourite: a star sticker stuck on the corner. */}
      <button
        type="button"
        aria-label={
          project.isFavorite
            ? `Remove ${project.name} from favorites`
            : `Add ${project.name} to favorites`
        }
        aria-pressed={Boolean(project.isFavorite)}
        onClick={() => toggleProjectFavorite(project.id)}
        className={`absolute right-0.5 top-4 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc83d] sm:right-1 sm:top-5 ${
          project.isFavorite ? "rotate-12 scale-105" : "hover:rotate-12"
        }`}
      >
        <Star
          className={`size-6 drop-shadow-[0_2px_2px_rgba(122,75,0,0.25)] transition-colors ${
            project.isFavorite
              ? "fill-[#ffcf33] text-[#f0a800]"
              : "fill-white/90 text-[#d9cfbd] group-hover:text-[#f0b400]"
          }`}
          strokeWidth={2.2}
        />
      </button>
    </article>
  );
}
