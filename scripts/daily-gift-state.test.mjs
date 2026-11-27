import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyGiftDay,
  shouldShowDailyGift,
  rememberDailyGiftShown,
  rememberDailyGiftClaimed,
  wasDailyGiftClaimed,
} from "../src/lib/dailyGiftState.ts";
function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
test("dismissing a gift survives WebView reload and navigation on the same day", () => {
  const disk = storage();
  const day = "2026-11-27";
  assert.equal(shouldShowDailyGift(day, disk), true);
  rememberDailyGiftShown(day, disk);
  // Fresh reads use persisted storage, independent of component/session memory.
  assert.equal(shouldShowDailyGift(day, disk), false);
  assert.equal(wasDailyGiftClaimed(day, disk), false);
});
test("confirmed claims suppress repeat claims and stale status responses", () => {
  const disk = storage();
  rememberDailyGiftClaimed("2026-11-27", disk);
  assert.equal(wasDailyGiftClaimed("2026-11-27", disk), true);
  assert.equal(shouldShowDailyGift("2026-11-27", disk), false);
  assert.equal(shouldShowDailyGift("2026-11-28", disk), true);
  assert.equal(wasDailyGiftClaimed("2026-11-28", disk), false);
});
test("gift day resets at midnight Vietnam time, independent of device timezone", () => {
  assert.equal(dailyGiftDay(new Date("2026-11-27T16:59:59Z")), "2026-11-27");
  assert.equal(dailyGiftDay(new Date("2026-11-27T17:00:00Z")), "2026-11-28");
});
test("unavailable or damaged storage does not crash the reward flow", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(shouldShowDailyGift("2026-11-27", broken), true);
  assert.doesNotThrow(() => rememberDailyGiftClaimed("2026-11-27", broken));
  assert.equal(
    shouldShowDailyGift("2026-11-27", { getItem: () => "not-json", setItem: () => {} }),
    true,
  );
});
