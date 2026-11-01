import { getSupabase } from "./supabase";
import { initPlayer, refreshPlayer, usePlayerStore } from "./player";

export interface Contest {
  id: string;
  title: string;
  description: string;
  page_id: string | null;
  starts_at: string;
  ends_at: string;
  max_participants: number;
  prizes: number[];
  results_published: boolean;
  /** When the ranking was published (migration 0005); missing on older databases. */
  results_published_at?: string | null;
  entries: number;
}

export type ContestPhase = "upcoming" | "live" | "judging" | "finished";

export interface MySubmission {
  id: string;
  contest_id: string;
  image_path: string;
  rank: number | null;
  updated_at: string;
}

export interface HallOfFameEntry {
  id: string;
  contest_id: string;
  contest_title: string;
  ends_at: string;
  player_name: string;
  image_path: string;
  rank: number;
}

/** Someone who joined a contest. `image_path` is null while the contest is live. */
export interface ContestEntry {
  id: string;
  contest_id: string;
  player_name: string;
  created_at: string;
  image_path: string | null;
  rank: number | null;
  /** Judge's score 1–10, visible once results are published. */
  score?: number | null;
}

/** Friendly name kids see for whoever judges in /admin. */
export const JUDGE_NAME = "Captain Crayon";

/** "Sun, Nov 3" — the day winners can be expected (right after the contest ends). */
export function formatResultsDay(contest: Pick<Contest, "ends_at">) {
  return new Date(contest.ends_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function contestPhase(contest: Contest, now = Date.now()): ContestPhase {
  if (contest.results_published) return "finished";
  if (now < new Date(contest.starts_at).getTime()) return "upcoming";
  if (now <= new Date(contest.ends_at).getTime()) return "live";
  return "judging";
}

export function spotsLeft(contest: Contest) {
  return Math.max(0, contest.max_participants - contest.entries);
}

export async function fetchContests(): Promise<Contest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contest_overview")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Contest[];
}

export async function fetchContest(id: string): Promise<Contest | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("contest_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Contest | null) ?? null;
}

/** The contest worth showing on the home screen: live > upcoming > judging > latest finished. */
/** How long a finished contest stays on the home banner after it ended. */
export const FINISHED_BANNER_DAYS = 2;

export function pickFeaturedContest(contests: Contest[], now = Date.now()) {
  const by = (phase: ContestPhase) =>
    contests.filter((contest) => contestPhase(contest, now) === phase);
  const live = by("live").sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at));
  const upcoming = by("upcoming").sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  // Finished contests stay featured for a couple of days after they finished, newest first.
  // "Finished" means the ranking was published, which is often before ends_at.
  const finishedAt = (contest: Contest) =>
    contest.results_published_at
      ? +new Date(contest.results_published_at)
      : Math.min(+new Date(contest.ends_at), now);
  const finished = by("finished")
    .filter((contest) => now - finishedAt(contest) <= FINISHED_BANNER_DAYS * 86_400_000)
    .sort((a, b) => finishedAt(b) - finishedAt(a));
  return live[0] ?? upcoming[0] ?? by("judging")[0] ?? finished[0] ?? null;
}

export async function fetchMySubmissions(): Promise<MySubmission[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  await initPlayer();
  const { deviceId } = usePlayerStore.getState();
  if (!deviceId) return [];
  const { data, error } = await supabase
    .from("submissions")
    .select("id, contest_id, image_path, rank, updated_at")
    .eq("device_id", deviceId);
  if (error) throw error;
  return (data ?? []) as MySubmission[];
}

export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hall_of_fame")
    .select("*")
    .order("ends_at", { ascending: false })
    .order("rank", { ascending: true })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as HallOfFameEntry[];
}

/** Shrink the exported drawing for upload: max 1400px, WebP (JPEG fallback on old Safari). */
export async function compressForUpload(canvas: HTMLCanvasElement): Promise<Blob> {
  const max = 1400;
  const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => out.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg", 0.85);
  if (!jpeg) throw new Error("encode_failed");
  return jpeg;
}

/** Upload the drawing and create/replace this device's entry. */
export async function submitEntry(contestId: string, image: Blob): Promise<MySubmission> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("not_signed_in");
  await initPlayer();
  const { deviceId, name } = usePlayerStore.getState();
  if (!deviceId) throw new Error("not_signed_in");

  // Path is fixed by the DB trigger + storage policy; always .webp even for a JPEG fallback.
  const path = `${contestId}/${deviceId}.webp`;
  const upload = await supabase.storage
    .from("submissions")
    .upload(path, image, { upsert: true, contentType: image.type, cacheControl: "60" });
  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from("submissions")
    .upsert(
      {
        contest_id: contestId,
        device_id: deviceId,
        player_name: name ?? "Artist",
        image_path: path,
      },
      { onConflict: "contest_id,device_id" },
    )
    .select("id, contest_id, image_path, rank, updated_at")
    .single();
  if (error) throw error;

  void refreshPlayer(); // +5 entry stars
  return data as MySubmission;
}

export async function buyPremiumPage(pageId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("not_signed_in");
  await initPlayer();
  const { data, error } = await supabase.rpc("buy_premium_page", { p_page_id: pageId });
  if (error) throw error;
  await refreshPlayer();
  return data as number;
}

export async function fetchPremiumPrices(): Promise<Record<string, number>> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data } = await supabase.from("premium_pages").select("id, price").eq("active", true);
  return Object.fromEntries((data ?? []).map((row) => [row.id as string, row.price as number]));
}

export function formatCountdown(target: string, now = Date.now()) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

export async function fetchContestWinners(contestId: string): Promise<HallOfFameEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hall_of_fame")
    .select("*")
    .eq("contest_id", contestId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HallOfFameEntry[];
}

/** Everyone who joined; empty if the `contest_entries` view isn't installed yet. */
export async function fetchContestEntries(contestId: string): Promise<ContestEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contest_entries")
    .select("*")
    .eq("contest_id", contestId)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.warn("[contests] entries unavailable", error.message);
    return [];
  }
  return (data ?? []) as ContestEntry[];
}
