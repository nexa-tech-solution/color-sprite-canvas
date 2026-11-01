import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronLeft, Clock, Paintbrush, Star, Users, X } from "lucide-react";
import {
  contestPhase,
  fetchContest,
  fetchContestEntries,
  fetchContestWinners,
  fetchHallOfFame,
  fetchMySubmissions,
  formatCountdown,
  formatResultsDay,
  JUDGE_NAME,
  spotsLeft,
  type Contest,
  type ContestEntry,
  type HallOfFameEntry,
  type MySubmission,
} from "@/lib/contests";
import { coloringPageThumbToSrc, findColoringPage } from "@/lib/coloringPages";
import { createProject, initProjectStore, listProjects } from "@/lib/projects";
import { submissionImageUrl } from "@/lib/supabase";
import { useNow } from "@/components/contest/useContestData";
import { StarArtists } from "@/components/contest/StarArtists";
import { LoadingImage } from "@/components/contest/LoadingImage";
import { AppNav, useNavPageClass } from "@/components/nav/AppNav";
import { usePlayerStore } from "@/lib/player";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/contests/$contestId")({
  component: ContestPage,
});

const MEDAL = ["🥇", "🥈", "🥉"];

function ContestPage() {
  const { contestId } = Route.useParams();
  const navigate = useNavigate();
  const now = useNow(15_000);
  const [contest, setContest] = useState<Contest | null>(null);
  const [entry, setEntry] = useState<MySubmission | null>(null);
  const [winners, setWinners] = useState<HallOfFameEntry[]>([]);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [pastStars, setPastStars] = useState<HallOfFameEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "offline">("loading");

  const load = useCallback(async () => {
    try {
      const [nextContest, mine, nextWinners, nextEntries, hallOfFame] = await Promise.all([
        fetchContest(contestId),
        fetchMySubmissions(),
        fetchContestWinners(contestId),
        fetchContestEntries(contestId),
        fetchHallOfFame().catch(() => []),
        initProjectStore(),
      ]);
      setContest(nextContest);
      setEntry(mine.find((item) => item.contest_id === contestId) ?? null);
      setWinners(nextWinners);
      setEntries(nextEntries);
      setPastStars(hallOfFame.filter((item) => item.contest_id !== contestId));
      setState(nextContest ? "ready" : "missing");
    } catch {
      setState("offline");
    }
  }, [contestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const localProject = useMemo(
    () =>
      state === "ready"
        ? listProjects().find((project) => project.contestId === contestId)
        : undefined,
    [contestId, state],
  );

  if (state === "loading") {
    return (
      <Shell>
        <ContestSkeleton />
      </Shell>
    );
  }

  if (state !== "ready" || !contest) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-24 text-center text-slate-500">
          <p className="font-display text-xl font-semibold text-slate-700">
            {state === "missing" ? "This contest doesn't exist." : "No internet connection."}
          </p>
          {state === "offline" && (
            <button
              type="button"
              onClick={() => {
                setState("loading");
                void load();
              }}
              className="cursor-pointer rounded-full bg-violet-600 px-5 py-2 font-semibold text-white"
            >
              Try again
            </button>
          )}
        </div>
      </Shell>
    );
  }

  const phase = contestPhase(contest, now);
  const ranked = entries.filter((item) => item.rank).sort((a, b) => a.rank! - b.rank!);
  const page = findColoringPage(contest.page_id);
  const left = spotsLeft(contest);
  const canJoin = phase === "live" && (Boolean(entry) || left > 0);
  const myImage =
    localProject?.submission?.image ??
    (entry ? submissionImageUrl(entry.image_path, entry.updated_at) : null);

  const startColoring = () => {
    if (localProject) {
      navigate({ to: "/projects/$projectId", params: { projectId: localProject.id } });
      return;
    }
    const project = createProject({
      name: contest.title,
      contestId: contest.id,
      preferBlankCanvas: !page,
    });
    navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id },
      search: page ? { page: page.id } : {},
    });
  };

  // Once the contest is over the ranking is what matters, so the big picture shrinks to a thumbnail.
  const compact = phase === "judging" || phase === "finished";
  const thumbSrc = myImage ?? (page ? coloringPageThumbToSrc(page) : null);

  return (
    <Shell>
      <section
        className={`overflow-hidden bg-white ${
          compact
            ? "rounded-xl shadow-[0_6px_18px_-14px_rgba(80,60,160,0.45)] ring-1 ring-slate-100"
            : "rounded-2xl shadow-[0_18px_40px_-28px_rgba(80,60,160,0.6)] ring-1 ring-violet-100"
        }`}
      >
        {!compact && (myImage || page) && (
          <div className="flex justify-center bg-gradient-to-b from-amber-50 to-white px-6 pt-6">
            <div className="relative">
              {myImage ? (
                <LoadingImage
                  src={myImage}
                  alt="Your contest drawing"
                  className="h-56 rounded-xl bg-white object-contain p-2 shadow-sm ring-2 ring-emerald-200 sm:h-72"
                  draggable={false}
                />
              ) : (
                page && (
                  <img
                    src={coloringPageThumbToSrc(page)}
                    alt={page.name}
                    className="h-56 rounded-xl bg-white object-contain p-2 shadow-sm ring-1 ring-slate-100 sm:h-72"
                    draggable={false}
                  />
                )
              )}
              {myImage && (
                <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 font-display text-sm font-semibold text-white shadow-md ring-2 ring-white">
                  <CheckCircle2 className="size-4" />
                  {entry?.rank
                    ? `You won ${MEDAL[entry.rank - 1]}`
                    : entry
                      ? "Your drawing is in!"
                      : "Saved on this device"}
                </span>
              )}
            </div>
          </div>
        )}
        <div className={compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}>
          <div className="flex items-center gap-3 sm:gap-4">
            {compact && thumbSrc && (
              <img
                src={thumbSrc}
                alt={myImage ? "Your contest drawing" : (page?.name ?? "")}
                className={`size-14 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 sm:size-16 ${
                  myImage ? "ring-emerald-200" : "ring-slate-100"
                }`}
                draggable={false}
              />
            )}
            <div className="min-w-0">
              <h1
                className={`font-display font-semibold leading-tight text-slate-800 ${
                  compact ? "text-xl sm:text-2xl" : "text-3xl"
                }`}
              >
                {contest.title}
              </h1>
              {compact && (
                // One line instead of the big prize cards: status, prizes, and your medal.
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-slate-500">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs text-white ${
                      phase === "finished" ? "bg-rose-500" : "bg-amber-400 text-amber-950"
                    }`}
                  >
                    {phase === "finished" ? "Finished" : "Judging"}
                  </span>
                  <span className="text-amber-700">
                    {contest.prizes.map((prize, index) => `${MEDAL[index]} ${prize}`).join("  ")}
                  </span>
                  {entry?.rank != null && entry.rank <= 3 && (
                    <span className="text-emerald-600">You won {MEDAL[entry.rank - 1]}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          {contest.description && (
            <p
              className={`mt-2 whitespace-pre-line leading-relaxed text-slate-600 ${
                compact ? "line-clamp-2 text-sm" : "text-[15px]"
              }`}
            >
              {contest.description}
            </p>
          )}

          {!compact && (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <Pill icon={<Clock className="size-4" />}>
                  {phase === "live" && `Ends in ${formatCountdown(contest.ends_at, now)}`}
                  {phase === "upcoming" && `Starts in ${formatCountdown(contest.starts_at, now)}`}
                </Pill>
                <Pill icon={<Users className="size-4" />}>
                  {left > 0 ? `${left} of ${contest.max_participants} spots left` : "Full"}
                </Pill>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {contest.prizes.map((prize, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center rounded-xl bg-amber-50 py-3 ring-1 ring-amber-100"
                  >
                    <span className="text-2xl" aria-hidden>
                      {MEDAL[index]}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 font-display text-base font-semibold text-amber-700">
                      <Star className="size-4 fill-amber-400 text-amber-500" />
                      {prize}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-slate-400">
                {`${JUDGE_NAME} picks the 3 best · winners on ${formatResultsDay(contest)} · +5 stars for joining`}
              </p>
            </>
          )}

          {(phase === "live" || phase === "upcoming") && (
            <button
              type="button"
              onClick={startColoring}
              disabled={!canJoin}
              className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 font-display text-lg font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Paintbrush className="size-5" />
              {phase === "upcoming"
                ? "Not started yet"
                : !canJoin
                  ? "Contest is full"
                  : localProject || entry
                    ? "Keep coloring"
                    : "Start coloring"}
            </button>
          )}
          {phase === "live" && entry && (
            <p className="mt-2 text-center text-xs font-semibold text-slate-400">
              Change it and tap “Send again” while coloring. Only your newest drawing counts.
            </p>
          )}
        </div>
      </section>

      {ranked.length === 0 && winners.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 font-display text-2xl font-semibold text-slate-800">Winners</h2>
          <div className="grid grid-cols-3 gap-3">
            {winners.map((winner) => (
              <figure key={winner.id} className="rounded-2xl bg-white p-2 ring-1 ring-amber-100">
                <LoadingImage
                  src={submissionImageUrl(winner.image_path)}
                  alt={`Drawing by ${winner.player_name}`}
                  className="aspect-[3/4] w-full rounded-xl bg-slate-50 object-contain"
                />
                <figcaption className="mt-1.5 truncate text-center font-display text-sm font-semibold text-slate-700">
                  {MEDAL[winner.rank - 1]} {winner.player_name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {ranked.length > 0 ? (
        <Leaderboard entries={ranked} />
      ) : (
        <Competitors entries={entries.filter((item) => !item.rank)} phase={phase} />
      )}

      {pastStars.length > 0 && (
        <div className="mt-6">
          <StarArtists winners={pastStars} />
        </div>
      )}
    </Shell>
  );
}

/** Final ranking, 1 → last. Top 3 get medals (and won prize stars). */
function Leaderboard({ entries }: { entries: ContestEntry[] }) {
  const myName = usePlayerStore((state) => state.name);
  const [open, setOpen] = useState<ContestEntry | null>(null);
  const isMe = (item: ContestEntry) =>
    Boolean(myName) && item.player_name.trim().toLowerCase() === myName!.trim().toLowerCase();

  return (
    <section className="mt-6" aria-labelledby="leaderboard">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 id="leaderboard" className="font-display text-2xl font-semibold text-slate-800">
          Rankings
        </h2>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
          <Users className="size-4" />
          {entries.length}
        </span>
      </div>

      <ol className="space-y-2">
        {entries.map((item) => {
          const rank = item.rank!;
          const podium = rank <= 3;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!item.image_path}
                onClick={() => setOpen(item)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white p-2 pr-4 text-left ring-1 transition-transform active:scale-[0.98] ${
                  isMe(item)
                    ? "ring-2 ring-violet-300"
                    : podium
                      ? "ring-amber-200"
                      : "ring-slate-100"
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${
                    podium ? "bg-amber-50 text-2xl" : "bg-slate-100 text-slate-500"
                  }`}
                  aria-label={`Place ${rank}`}
                >
                  {podium ? MEDAL[rank - 1] : rank}
                </span>
                {item.image_path ? (
                  <LoadingImage
                    src={submissionImageUrl(item.image_path)}
                    alt=""
                    loading="lazy"
                    className="size-14 shrink-0 rounded-xl bg-white object-contain ring-1 ring-slate-100"
                    draggable={false}
                  />
                ) : (
                  <span className="size-14 shrink-0 rounded-xl bg-slate-100" />
                )}
                <span className="min-w-0 flex-1 truncate font-display text-base font-semibold text-slate-700">
                  {item.player_name}
                  {isMe(item) && <span className="text-violet-500"> (you)</span>}
                </span>
                {item.score != null && (
                  <span className="inline-flex shrink-0 items-center gap-1 font-display text-base font-semibold text-amber-600">
                    <Star className="size-4 fill-amber-400 text-amber-500" />
                    {item.score}
                    <span className="text-xs text-slate-400">/10</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <EntryDialog entry={open} onClose={() => setOpen(null)} />
    </section>
  );
}

/** Everyone who joined. Names while live; drawings once the contest has ended. */
function Competitors({
  entries,
  phase,
}: {
  entries: ContestEntry[];
  phase: ReturnType<typeof contestPhase>;
}) {
  const myName = usePlayerStore((state) => state.name);
  const [open, setOpen] = useState<ContestEntry | null>(null);
  if (entries.length === 0) return null;
  const showDrawings = entries.some((item) => item.image_path);
  const isMe = (item: ContestEntry) =>
    Boolean(myName) && item.player_name.trim().toLowerCase() === myName!.trim().toLowerCase();

  return (
    <section className="mt-6" aria-labelledby="competitors">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 id="competitors" className="font-display text-2xl font-semibold text-slate-800">
          {phase === "finished" ? "Everyone who joined" : "Artists in this contest"}
        </h2>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
          <Users className="size-4" />
          {entries.length}
        </span>
      </div>

      {showDrawings ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.image_path}
              onClick={() => setOpen(item)}
              className={`cursor-pointer rounded-2xl bg-white p-2 text-left ring-1 transition-transform active:scale-95 ${isMe(item) ? "ring-2 ring-violet-300" : "ring-slate-100"}`}
            >
              {item.image_path && (
                <LoadingImage
                  src={submissionImageUrl(item.image_path)}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-xl bg-white object-contain"
                  draggable={false}
                />
              )}
              <span className="mt-1.5 block truncate px-0.5 font-display text-sm font-semibold text-slate-700">
                {item.player_name}
                {isMe(item) && " (you)"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {entries.map((item) => (
              <li
                key={item.id}
                className={`inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 shadow-sm ring-1 ${isMe(item) ? "ring-violet-300" : "ring-slate-100"}`}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-violet-100 font-display text-sm font-semibold uppercase text-violet-700">
                  {item.player_name.slice(0, 1)}
                </span>
                <span className="font-display text-sm font-semibold text-slate-700">
                  {item.player_name}
                  {isMe(item) && " (you)"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-xs font-semibold text-slate-400">
            Drawings show up here when the contest ends.
          </p>
        </>
      )}

      <EntryDialog entry={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function ContestSkeleton() {
  const bar = "animate-pulse rounded-full bg-slate-200/80";
  return (
    <div aria-busy aria-label="Loading contest">
      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-violet-100">
        <div className="flex justify-center bg-gradient-to-b from-amber-50 to-white px-6 pt-6">
          <div className="h-56 w-44 animate-pulse rounded-xl bg-slate-200/70 sm:h-72 sm:w-56" />
        </div>
        <div className="space-y-3 p-5 sm:p-6">
          <div className={`h-8 w-3/4 ${bar}`} />
          <div className={`h-4 w-1/2 ${bar}`} />
          <div className="flex gap-2 pt-1">
            <div className={`h-8 w-32 ${bar}`} />
            <div className={`h-8 w-40 ${bar}`} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-xl bg-amber-50 ring-1 ring-amber-100"
              />
            ))}
          </div>
          <div className="h-14 animate-pulse rounded-xl bg-violet-100" />
        </div>
      </section>
      <div className="mt-6 space-y-3">
        <div className={`h-6 w-48 ${bar}`} />
        <div className="flex flex-wrap gap-2">
          {[24, 32, 20, 28].map((width) => (
            <div key={width} className={`h-9 ${bar}`} style={{ width: `${width * 4}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EntryDialog({ entry, onClose }: { entry: ContestEntry | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[min(calc(100vw-24px),560px)] max-w-none gap-0 overflow-hidden rounded-2xl border-0 p-0"
      >
        {entry?.image_path && (
          <>
            <DialogClose
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-white hover:text-slate-900"
            >
              <X className="size-5" />
            </DialogClose>
            <LoadingImage
              src={submissionImageUrl(entry.image_path)}
              alt={`Drawing by ${entry.player_name}`}
              className="max-h-[70dvh] w-full bg-white object-contain"
            />
            <div className="border-t border-slate-100 p-4">
              <DialogTitle className="truncate font-display text-xl font-semibold text-slate-800">
                {entry.player_name}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {entry.rank ? `Place ${entry.rank}` : "Joined this contest"}
                {entry.score != null && ` · ${entry.score}/10 stars from ${JUDGE_NAME}`}
              </DialogDescription>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const navPageClass = useNavPageClass({ bottomTabs: false });
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#fff7ec_0%,#f9fbff_40%)]">
      <div className={`px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] ${navPageClass}`}>
        <div className="mx-auto max-w-xl">
          <Link
            to="/contests"
            className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/80 py-2 pl-2 pr-4 font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100"
          >
            <ChevronLeft className="size-5" />
            Contests
          </Link>
          {children}
        </div>
      </div>
      <AppNav bottomTabs={false} />
    </main>
  );
}

function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
      {icon}
      {children}
    </span>
  );
}
