import { useCallback, useEffect, useState } from "react";
import { fetchContests, fetchMySubmissions, type Contest, type MySubmission } from "@/lib/contests";
import { initPlayer, refreshPlayer } from "@/lib/player";
import { isBackendConfigured } from "@/lib/supabase";

/** Contests and my entries for the home screen; refreshes when the app comes back. */
export function useContestData() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [mine, setMine] = useState<MySubmission[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isBackendConfigured) {
      setLoaded(true);
      return;
    }
    try {
      await initPlayer();
      const [nextContests, nextMine] = await Promise.all([fetchContests(), fetchMySubmissions()]);
      setContests(nextContests);
      setMine(nextMine);
      void refreshPlayer();
    } catch (error) {
      console.warn("[contests] load failed", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return { contests, mine, loaded, reload: load };
}

/** Re-render every `ms` so countdowns tick. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
