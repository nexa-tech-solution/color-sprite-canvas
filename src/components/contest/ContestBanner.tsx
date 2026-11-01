import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CheckCircle2, Palette, Users } from "lucide-react";
import {
  contestPhase,
  formatCountdown,
  spotsLeft,
  type Contest,
  type MySubmission,
} from "@/lib/contests";
import dogArt from "@/assets/contest/dog.webp";
import easelArt from "@/assets/contest/easel.webp";
import skyArt from "@/assets/contest/sky.webp";
import { useNow } from "./useContestData";

// Status pill colours: green while it's on, red once it's over.
const PHASE_PILL = {
  live: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  upcoming: "bg-sky-50 text-sky-600 ring-sky-200",
  judging: "bg-amber-50 text-amber-600 ring-amber-200",
  finished: "bg-rose-50 text-rose-500 ring-rose-200",
} as const;

const PHASE_CTA = {
  live: "Join now",
  upcoming: "Take a look",
  judging: "See entries",
  finished: "See winners",
} as const;

/** Full-width illustrated strip for the featured contest; the whole strip opens the contest page. */
export function ContestBanner({ contest, entry }: { contest: Contest; entry?: MySubmission }) {
  const now = useNow();
  const phase = contestPhase(contest, now);
  const left = spotsLeft(contest);
  const [firstWord, ...restWords] = contest.title.split(" ");

  const status =
    phase === "live"
      ? `${formatCountdown(contest.ends_at, now)} left`
      : phase === "upcoming"
        ? `Starts in ${formatCountdown(contest.starts_at, now)}`
        : phase === "judging"
          ? "Winners soon"
          : "Finished";

  return (
    <Link
      to="/contests/$contestId"
      params={{ contestId: contest.id }}
      aria-label={`${contest.title}: ${status}`}
      className="group relative block overflow-hidden bg-[#eadfff] bg-cover bg-center"
      style={{ backgroundImage: `url(${skyArt})` }}
    >
      <img
        src={dogArt}
        alt=""
        draggable={false}
        className="pointer-events-none absolute bottom-0 left-1 h-[96px] w-auto transition-transform duration-300 group-hover:-rotate-3 sm:left-5 sm:h-[132px] lg:left-8 lg:h-[146px]"
      />
      <img
        src={easelArt}
        alt=""
        draggable={false}
        className="pointer-events-none absolute bottom-1 right-3 hidden h-[100px] w-auto sm:block lg:right-10 lg:h-[118px]"
      />

      <div className="relative flex min-h-[112px] items-center py-3 pl-[114px] pr-3 sm:min-h-[148px] sm:py-4 sm:pl-[170px] sm:pr-[140px] lg:pl-[196px] lg:pr-[170px]">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5 lg:flex-row lg:items-center lg:gap-5">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-600 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
              <Palette className="size-3 sm:size-3.5" strokeWidth={2.4} />
              Drawing contest
            </span>
            <h2 className="mt-0.5 truncate font-display text-[19px] font-extrabold leading-tight sm:mt-1 sm:text-[28px]">
              <span className="text-violet-700">{firstWord}</span>{" "}
              <span className="text-pink-500">{restWords.join(" ")}</span>
            </h2>
          </div>

          <span aria-hidden className="hidden h-10 w-px shrink-0 bg-violet-300/60 lg:block" />

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ring-1 sm:gap-1.5 sm:px-2.5 sm:text-xs ${PHASE_PILL[phase]}`}
            >
              <CalendarClock className="size-3.5" />
              {status}
            </span>
            {(phase === "live" || phase === "upcoming") && (
              <span className="hidden items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-violet-600 sm:inline-flex">
                <Users className="size-3.5" />
                {left > 0 ? `${left} spots` : "Full"}
              </span>
            )}
            {entry ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-600 shadow-sm sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm">
                <CheckCircle2 className="size-3.5 sm:size-4" />
                {entry.rank ? `You're #${entry.rank}` : "Joined"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(180deg,#9b5cf6_0%,#7c3aed_100%)] px-3 py-1.5 text-xs font-bold sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm text-white shadow-[0_10px_20px_-12px_rgba(124,58,237,0.9)] transition-transform group-hover:translate-x-0.5">
                {PHASE_CTA[phase]}
                <ArrowRight className="size-3.5 sm:size-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Same footprint as the banner so nothing jumps when the contest loads. */
export function ContestBannerSkeleton() {
  return <div aria-hidden className="h-[112px] animate-pulse bg-violet-100/70 sm:h-[148px]" />;
}
