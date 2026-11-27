import { useEffect, useRef, useState } from "react";
import { Gift, Loader2, Star, Check, X } from "lucide-react";
import { toast } from "sonner";
import { claimDailyCheckin, dailyCheckinStatus } from "@/lib/rewards";
import { friendlyError } from "@/lib/supabase";
import { usePlayerStore } from "@/lib/player";
import { fireConfetti } from "@/lib/confetti";
import {
  dailyGiftDay,
  rememberDailyGiftShown,
  shouldShowDailyGift,
  wasDailyGiftClaimed,
} from "@/lib/dailyGiftState";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function DailyCheckin({
  onNameRequired,
  allowAutoOpen = true,
}: {
  onNameRequired: () => void;
  allowAutoOpen?: boolean;
}) {
  const playerName = usePlayerStore((state) => state.name);
  const [waitingForName, setWaitingForName] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [rewardDay, setRewardDay] = useState("");
  const shownDay = useRef("");
  const claimInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [availability, setAvailability] = useState<"loading" | "ready" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [reward, setReward] = useState(10);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void dailyCheckinStatus()
        .then((value) => {
          if (!active) return;
          const day = dailyGiftDay();
          setRewardDay(day);
          setClaimed(value.claimed || wasDailyGiftClaimed(day));
          setReward(value.reward);
          setAvailability("ready");
          setLoadError("");
        })
        .catch((error) => {
          if (!active) return;
          setAvailability("unavailable");
          setLoadError(friendlyError(error));
        });
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [open, refreshKey]);
  useEffect(() => {
    if (
      !allowAutoOpen ||
      availability !== "ready" ||
      claimed !== false ||
      !rewardDay ||
      shownDay.current === rewardDay
    )
      return;
    if (!shouldShowDailyGift(rewardDay)) {
      shownDay.current = rewardDay;
      return;
    }
    shownDay.current = rewardDay;
    rememberDailyGiftShown(rewardDay);
    setCelebrating(false);
    setOpen(true);
  }, [availability, claimed, rewardDay, allowAutoOpen]);

  useEffect(() => {
    if (waitingForName && playerName && allowAutoOpen) {
      setWaitingForName(false);
      setOpen(true);
    }
  }, [waitingForName, playerName, allowAutoOpen]);

  const claim = async () => {
    if (claimInFlight.current || busy || availability !== "ready" || claimed === true) return;
    claimInFlight.current = true;
    setBusy(true);
    try {
      const awarded = await claimDailyCheckin();
      setClaimed(true);
      if (awarded) {
        setCelebrating(true);
        fireConfetti({ count: 140, duration: 2600 });
        toast.success(`Daily gift: +${reward} stars!`);
      } else toast.info("You've already collected today's gift. Come back tomorrow!");
    } catch (error) {
      if ((error as { message?: string }).message?.includes("name_required")) {
        setOpen(false);
        setWaitingForName(true);
        onNameRequired();
      } else if ((error as { message?: string }).message === "daily_unavailable") {
        setAvailability("unavailable");
        setLoadError(friendlyError(error));
      } else toast.error(friendlyError(error));
    } finally {
      claimInFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent
          hideClose
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="w-[calc(100vw-2rem)] max-w-sm gap-0 overflow-y-auto rounded-[28px] sm:rounded-[28px] border border-amber-100 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_75%)] p-6 text-center max-h-[calc(100dvh_-_var(--safe-top)_-_env(safe-area-inset-bottom,0px)_-_2rem)]"
        >
          <DialogClose
            disabled={busy}
            aria-label="Close daily gift"
            className="absolute right-3 top-3 flex size-10 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-amber-100 disabled:opacity-40"
          >
            <X className="size-5" />
          </DialogClose>
          <div className="mx-auto mt-3 flex size-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
            {claimed ? <Check className="size-11" /> : <Gift className="size-11" />}
          </div>
          <DialogTitle className="mt-4 font-display text-2xl font-semibold text-slate-800">
            {celebrating ? "Hooray! Your gift is here!" : "Daily gift"}
          </DialogTitle>
          <DialogDescription
            className="mt-2 text-sm leading-relaxed text-slate-500"
            aria-live="polite"
          >
            {celebrating
              ? `You earned ${reward} stars. Time to make something colorful!`
              : availability === "loading"
                ? "Checking today's gift…"
                : availability === "unavailable"
                  ? loadError
                  : claimed
                    ? "You've collected today's gift. Come back tomorrow for more stars!"
                    : "A little gift for your next masterpiece. Collect your stars today!"}
          </DialogDescription>
          <div className="my-5 flex items-center justify-center gap-2 font-display text-4xl font-semibold text-amber-600">
            <Star className="size-9 fill-amber-400 text-amber-500" />+{reward}
            <span className="self-end pb-1 text-base">stars</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (celebrating) {
                setOpen(false);
                return;
              }
              if (availability === "unavailable") {
                setAvailability("loading");
                setRefreshKey((value) => value + 1);
              } else void claim();
            }}
            disabled={
              busy ||
              availability === "loading" ||
              (availability === "ready" && claimed === true && !celebrating)
            }
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-500 font-display text-base font-semibold text-white hover:bg-amber-600 disabled:cursor-default disabled:bg-amber-100 disabled:text-amber-700"
          >
            {(busy || availability === "loading") && <Loader2 className="size-5 animate-spin" />}
            {celebrating
              ? "Awesome!"
              : busy
                ? "Collecting…"
                : availability === "loading"
                  ? "Checking…"
                  : availability === "unavailable"
                    ? "Try again"
                    : claimed
                      ? "Collected today"
                      : `Claim +${reward} stars`}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
