import { getSupabase } from "./supabase";
import { initPlayer, refreshPlayer, saveAdUnlock } from "./player";
import { watchInterstitialAd } from "./nativeBridge";

export async function dailyCheckinStatus(): Promise<{ claimed: boolean; reward: number }> {
  await initPlayer();
  const db = getSupabase();
  if (!db) throw new Error("not_signed_in");
  const { data, error } = await db.rpc("daily_checkin_status");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") throw new Error("daily_unavailable");
    throw error;
  }
  return data;
}

export async function claimDailyCheckin() {
  await initPlayer();
  const db = getSupabase();
  if (!db) throw new Error("not_signed_in");
  const { data, error } = await db.rpc("claim_daily_checkin");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") throw new Error("daily_unavailable");
    throw error;
  }
  await refreshPlayer();
  return Boolean(data);
}

export async function unlockPageWithAd(pageId: string) {
  if (!(await watchInterstitialAd())) return false;
  saveAdUnlock(pageId);
  return true;
}
