import { create } from "zustand";
import { getSupabase, isBackendConfigured } from "./supabase";

const NAME_KEY = "pastel-paint.player-name";

interface PlayerState {
  /** Supabase anonymous user id — the device's identity. */
  deviceId: string | null;
  name: string | null;
  points: number;
  purchases: string[];
  status: "idle" | "loading" | "ready" | "offline";
}

export const usePlayerStore = create<PlayerState>(() => ({
  deviceId: null,
  name: null, // filled from localStorage in initPlayer (after hydration, so SSR matches)
  points: 0,
  purchases: [],
  status: "idle",
}));

function readLocalName() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

function writeLocalName(name: string | null) {
  try {
    if (name) window.localStorage.setItem(NAME_KEY, name);
    else window.localStorage.removeItem(NAME_KEY);
  } catch {
    // Name still lives in memory and on the server.
  }
}

const isDuplicateName = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "23505" || error.message?.includes("players_name_unique")));

let initPromise: Promise<void> | null = null;

/** Sign the device in anonymously (once) and load name, points and purchases. */
export function initPlayer(): Promise<void> {
  if (initPromise) return initPromise;
  if (!usePlayerStore.getState().name) usePlayerStore.setState({ name: readLocalName() });
  const supabase = getSupabase();
  if (!supabase) {
    usePlayerStore.setState({ status: "offline" });
    return Promise.resolve();
  }

  usePlayerStore.setState({ status: "loading" });
  initPromise = (async () => {
    try {
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        const result = await supabase.auth.signInAnonymously();
        if (result.error) throw result.error;
        data = { session: result.data.session };
      }
      const deviceId = data.session?.user.id ?? null;
      usePlayerStore.setState({ deviceId });

      const { data: player } = await supabase
        .from("players")
        .select("name")
        .eq("device_id", deviceId)
        .maybeSingle();

      const localName = readLocalName();
      if (player?.name) {
        writeLocalName(player.name);
        usePlayerStore.setState({ name: player.name });
      } else if (localName) {
        // Name typed while offline (or before sign-in finished): sync it up.
        const { error } = await supabase
          .from("players")
          .insert({ device_id: deviceId, name: localName });
        if (isDuplicateName(error)) {
          // Someone took it meanwhile — clearing the name re-opens the name sheet.
          writeLocalName(null);
          usePlayerStore.setState({ name: null });
        }
      }

      await refreshPlayer();
      usePlayerStore.setState({ status: "ready" });
    } catch (error) {
      console.warn("[player] offline", error);
      initPromise = null; // retry next time
      usePlayerStore.setState({ status: "offline" });
    }
  })();
  return initPromise;
}

export async function refreshPlayer() {
  const supabase = getSupabase();
  const { deviceId } = usePlayerStore.getState();
  if (!supabase || !deviceId) return;

  const [pointsResult, purchasesResult] = await Promise.all([
    supabase.from("player_points").select("points").eq("device_id", deviceId).maybeSingle(),
    supabase.from("purchases").select("page_id").eq("device_id", deviceId),
  ]);
  usePlayerStore.setState({
    points: pointsResult.data?.points ?? 0,
    purchases: (purchasesResult.data ?? []).map((row) => row.page_id as string),
  });
}

export type NameResult = "saved" | "taken" | "offline";

/** Save the nickname. Names are unique; "taken" means pick another one. */
export async function setPlayerName(rawName: string): Promise<NameResult> {
  const name = rawName.trim().slice(0, 24);
  if (!name) return "taken";

  const supabase = getSupabase();
  if (supabase) await initPlayer();
  const { deviceId } = usePlayerStore.getState();

  if (!supabase || !deviceId) {
    // Offline: keep it locally; uniqueness is checked when we're back online.
    writeLocalName(name);
    usePlayerStore.setState({ name });
    return "offline";
  }

  const { error } = await supabase.from("players").upsert({ device_id: deviceId, name });
  if (isDuplicateName(error)) return "taken";
  if (error) {
    console.warn("[player] name not saved", error);
    writeLocalName(name);
    usePlayerStore.setState({ name });
    return "offline";
  }

  writeLocalName(name);
  usePlayerStore.setState({ name });
  return "saved";
}

/** Quick check while typing; true when unknown (offline) so the kid isn't blocked. */
export async function isNameAvailable(name: string) {
  const supabase = getSupabase();
  if (!supabase || !name.trim()) return true;
  const { data, error } = await supabase.rpc("name_available", { p_name: name });
  return error ? true : Boolean(data);
}

export const playerFeaturesEnabled = isBackendConfigured;
