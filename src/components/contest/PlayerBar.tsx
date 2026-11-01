import { Pencil, Star } from "lucide-react";
import { usePlayerStore } from "@/lib/player";

/** Home header: "Hi, Mia ✏️" on the left, star balance on the right. */
export function PlayerBar({ onEditName }: { onEditName: () => void }) {
  const name = usePlayerStore((state) => state.name);
  const points = usePlayerStore((state) => state.points);
  const status = usePlayerStore((state) => state.status);
  const loading = (status === "idle" || status === "loading") && !name;

  return (
    <div className="relative z-10 flex items-center justify-between gap-3 px-1 sm:px-3 lg:px-8">
      <button
        type="button"
        onClick={onEditName}
        aria-label={name ? `Change name, currently ${name}` : "Set your name"}
        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-full bg-white/85 py-1.5 pl-1.5 pr-3.5 shadow-[0_6px_18px_-10px_rgba(80,60,160,0.45)] ring-1 ring-white backdrop-blur transition-transform active:scale-95"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500 font-display text-sm font-semibold uppercase text-white">
          {loading ? "" : (name ?? "?").slice(0, 1)}
        </span>
        {loading ? (
          <span className="h-3.5 w-20 animate-pulse rounded-full bg-slate-200" aria-hidden />
        ) : (
          <span className="truncate font-display text-[15px] font-semibold text-slate-700">
            {name ? `Hi, ${name}!` : "Hi, artist!"}
          </span>
        )}
        <Pencil className="size-3.5 shrink-0 text-slate-400" />
      </button>

      <div
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/85 py-1.5 pl-2 pr-3.5 shadow-[0_6px_18px_-10px_rgba(160,110,0,0.45)] ring-1 ring-white backdrop-blur"
        aria-label={`${points} stars`}
        title={
          status === "offline" ? "Offline — stars will update when you're online" : "Your stars"
        }
      >
        <Star className="size-5 fill-amber-400 text-amber-500" strokeWidth={2} />
        {(status === "idle" || status === "loading") && points === 0 ? (
          <span className="h-3.5 w-6 animate-pulse rounded-full bg-slate-200" aria-hidden />
        ) : (
          <span className="font-display text-[15px] font-semibold tabular-nums text-slate-700">
            {points}
          </span>
        )}
      </div>
    </div>
  );
}
