type GiftMemory = { shownDay?: string; claimedDay?: string };
type GiftStorage = Pick<Storage, "getItem" | "setItem">;
const KEY = "pastel-paint.daily-gift";

/** UI memory follows the same Vietnam calendar day as the server award constraint. */
export function dailyGiftDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function browserStorage(): GiftStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
function read(storage = browserStorage()): GiftMemory {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
function write(memory: GiftMemory, storage = browserStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* Server still prevents duplicate rewards. */
  }
}
export function wasDailyGiftClaimed(day: string, storage = browserStorage()) {
  return read(storage).claimedDay === day;
}
export function shouldShowDailyGift(day: string, storage = browserStorage()) {
  const memory = read(storage);
  return memory.shownDay !== day && memory.claimedDay !== day;
}
export function rememberDailyGiftShown(day: string, storage = browserStorage()) {
  write({ ...read(storage), shownDay: day }, storage);
}
export function rememberDailyGiftClaimed(day: string, storage = browserStorage()) {
  write({ shownDay: day, claimedDay: day }, storage);
}
