import { useState } from "react";
import { X } from "lucide-react";
import type { HallOfFameEntry } from "@/lib/contests";
import { submissionImageUrl } from "@/lib/supabase";
import { LoadingImage } from "./LoadingImage";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const MEDALS: Record<
  number,
  { emoji: string; ring: string; label: string; short: string; badge: string }
> = {
  1: {
    emoji: "🥇",
    ring: "ring-amber-300",
    label: "1st place",
    short: "1st",
    badge: "bg-amber-400 text-amber-950",
  },
  2: {
    emoji: "🥈",
    ring: "ring-slate-300",
    label: "2nd place",
    short: "2nd",
    badge: "bg-slate-200 text-slate-800",
  },
  3: {
    emoji: "🥉",
    ring: "ring-orange-300",
    label: "3rd place",
    short: "3rd",
    badge: "bg-orange-300 text-orange-950",
  },
};

/** Hall of fame: winning drawings from published contests, visible on every device. */
export function StarArtists({ winners }: { winners: HallOfFameEntry[] }) {
  const [open, setOpen] = useState<HallOfFameEntry | null>(null);
  if (winners.length === 0) return null;

  return (
    <section aria-labelledby="star-artists">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">
            Hall of fame
          </p>
          <h2 id="star-artists" className="font-display text-2xl font-semibold text-slate-800">
            Star artists
          </h2>
        </div>
      </div>

      <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-3 pt-1 [scrollbar-width:none] sm:gap-4">
        {winners.map((entry) => {
          const medal = MEDALS[entry.rank];
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setOpen(entry)}
              aria-label={`${entry.player_name}, ${medal.label} in ${entry.contest_title}`}
              className={`relative w-36 shrink-0 cursor-pointer snap-start rounded-2xl bg-white p-2 text-left shadow-[0_12px_28px_-20px_rgba(80,60,160,0.6)] ring-2 transition-transform active:scale-95 sm:w-44 ${medal.ring}`}
            >
              <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-white">
                <LoadingImage
                  src={submissionImageUrl(entry.image_path)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </span>
              {/* Medal badge sits inside the card so the scroller never clips it. */}
              <span
                className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2.5 font-display text-sm font-semibold shadow-md ring-2 ring-white ${medal.badge}`}
                aria-hidden
              >
                <span className="text-xl leading-none">{medal.emoji}</span>
                {medal.short}
              </span>
              <span className="mt-1.5 block truncate px-0.5 font-display text-sm font-semibold text-slate-700">
                {entry.player_name}
              </span>
              <span className="block truncate px-0.5 text-[11px] font-semibold text-slate-400">
                {entry.contest_title}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent
          hideClose
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="w-[min(calc(100vw-24px),560px)] max-w-none gap-0 overflow-hidden rounded-2xl border-0 p-0"
        >
          {open && (
            <>
              <DialogClose
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md ring-1 ring-slate-200 backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
              >
                <X className="size-5" />
              </DialogClose>
              <LoadingImage
                src={submissionImageUrl(open.image_path)}
                alt={`Drawing by ${open.player_name}`}
                className="max-h-[70dvh] w-full bg-white object-contain"
              />
              <div className="flex items-center gap-3 border-t border-slate-100 p-4">
                <span className="text-4xl" aria-hidden>
                  {MEDALS[open.rank].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate font-display text-xl font-semibold text-slate-800">
                    {open.player_name}
                  </DialogTitle>
                  <DialogDescription className="truncate text-sm text-slate-500">
                    {MEDALS[open.rank].label} · {open.contest_title}
                  </DialogDescription>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
