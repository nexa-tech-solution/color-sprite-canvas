import { getSupabase } from "./supabase";
import { initPlayer, refreshPlayer, saveAdUnlock } from "./player";
import { watchInterstitialAd } from "./nativeBridge";
import { dailyGiftDay, rememberDailyGiftClaimed, wasDailyGiftClaimed } from "./dailyGiftState";

export async function dailyCheckinStatus(): Promise<{ claimed: boolean; reward: number }> {
  await initPlayer();
  const db = getSupabase();
  if (!db) throw new Error("not_signed_in");
  const { data, error } = await db.rpc("daily_checkin_status");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") throw new Error("daily_unavailable");
    throw error;
  }
  if (typeof data?.claimed !== "boolean" || typeof data?.reward !== "number")
    throw new Error("daily_unavailable");
  const day = dailyGiftDay();
  if (data.claimed) rememberDailyGiftClaimed(day);
  return { ...data, claimed: data.claimed || wasDailyGiftClaimed(day) };
}

export async function claimDailyCheckin() {
  const day = dailyGiftDay();
  if (wasDailyGiftClaimed(day)) return false;
  await initPlayer();
  const db = getSupabase();
  if (!db) throw new Error("not_signed_in");
  const { data, error } = await db.rpc("claim_daily_checkin");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") throw new Error("daily_unavailable");
    throw error;
  }
  // Only a real boolean is accepted; a truthy payload must never trigger confetti.
  if (typeof data !== "boolean") throw new Error("daily_unavailable");
  // Both true (new award) and false (already claimed) confirm today's claim on the server.
  rememberDailyGiftClaimed(day);
  await refreshPlayer().catch(() => {});
  return data === true;
}

export async function unlockPageWithAd(pageId: string) {
  if (!(await watchInterstitialAd())) return false;
  saveAdUnlock(pageId);
  return true;
}
