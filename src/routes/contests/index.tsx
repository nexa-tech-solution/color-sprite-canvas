import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CheckCircle2, ChevronRight, Clock, Trophy, Users } from "lucide-react";
import {
  contestPhase,
  formatCountdown,
  type Contest,
  type ContestPhase,
  type MySubmission,
} from "@/lib/contests";
import { coloringPageThumbToSrc, findColoringPage } from "@/lib/coloringPages";
import { playerFeaturesEnabled } from "@/lib/player";
import { PageShell } from "@/components/nav/PageShell";
import { useContestData, useNow } from "@/components/contest/useContestData";

export const Route = createFileRoute("/contests/")({
  component: ContestsPage,
});

const PHASE_CHIP: Record<ContestPhase, { className: string; label: string }> = {
  live: { className: "bg-emerald-500 text-white", label: "On now" },
  upcoming: { className: "bg-sky-500 text-white", label: "Coming soon" },
  judging: { className: "bg-amber-400 text-amber-950", label: "Judging" },
  finished: { className: "bg-rose-500 text-white", label: "Finished" },
};

const ORDER: Record<ContestPhase, number> = { live: 0, upcoming: 1, judging: 2, finished: 3 };

function ContestsPage() {
  const { contests, mine, loaded } = useContestData();
  const now = useNow();

  const { current, past } = useMemo(() => {
    const sorted = [...contests].sort(
      (a, b) =>
        ORDER[contestPhase(a, now)] - ORDER[contestPhase(b, now)] ||
        +new Date(b.ends_at) - +new Date(a.ends_at),
    );
    return {
      current: sorted.filter((contest) => contestPhase(contest, now) !== "finished"),
      past: sorted.filter((contest) => contestPhase(contest, now) === "finished"),
    };
  }, [contests, now]);

  const entryFor = (contest: Contest) => mine.find((entry) => entry.contest_id === contest.id);

  return (
    <PageShell title="Drawing contests" subtitle="Color, send your drawing, win stars!">
      {!playerFeaturesEnabled ? (
        <Empty text="Contests are not available right now." />
      ) : !loaded ? (
        <div className="space-y-3" aria-busy aria-label="Loading contests">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100"
            >
              <div className="size-20 shrink-0 animate-pulse rounded-xl bg-slate-200/80" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200/80" />
                <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-200/80" />
                <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-slate-200/80" />
              </div>
            </div>
          ))}
        </div>
      ) : contests.length === 0 ? (
        <Empty text="No contests yet. Check back soon!" />
      ) : (
        <div className="space-y-7">
          {current.length > 0 && (
            <Section title="Now & coming up">
              {current.map((contest) => (
                <ContestRow
                  key={contest.id}
                  contest={contest}
                  entry={entryFor(contest)}
                  now={now}
                />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Finished · see the rankings">
              {past.map((contest) => (
                <ContestRow
                  key={contest.id}
                  contest={contest}
                  entry={entryFor(contest)}
                  now={now}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContestRow({
  contest,
  entry,
  now,
}: {
  contest: Contest;
  entry?: MySubmission;
  now: number;
}) {
  const phase = contestPhase(contest, now);
  const chip = PHASE_CHIP[phase];
  const page = findColoringPage(contest.page_id);
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timing =
    phase === "live"
      ? `Ends in ${formatCountdown(contest.ends_at, now)}`
      : phase === "upcoming"
        ? `Starts in ${formatCountdown(contest.starts_at, now)}`
        : `${day(contest.starts_at)} – ${day(contest.ends_at)}`;

  return (
    <Link
      to="/contests/$contestId"
      params={{ contestId: contest.id }}
      className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_12px_30px_-24px_rgba(80,60,160,0.6)] ring-1 ring-slate-100 transition-transform active:scale-[0.98]"
    >
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 ring-1 ring-amber-100">
        {page ? (
          <img
            src={coloringPageThumbToSrc(page)}
            alt=""
            loading="lazy"
            className="h-full w-full bg-white object-contain p-1"
            draggable={false}
          />
        ) : (
          <Trophy className="size-8 text-amber-500" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${chip.className}`}
        >
          {chip.label}
        </span>
        <span className="mt-1 block truncate font-display text-lg font-semibold leading-tight text-slate-800">
          {contest.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {timing}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {contest.entries} {contest.entries === 1 ? "artist" : "artists"}
          </span>
          {entry && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              {entry.rank ? `You were #${entry.rank}` : "You joined"}
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-slate-100">
      <span className="flex size-16 items-center justify-center rounded-full bg-amber-50">
        <Trophy className="size-8 text-amber-500" />
      </span>
      <p className="font-display text-lg font-semibold text-slate-600">{text}</p>
    </div>
  );
}
