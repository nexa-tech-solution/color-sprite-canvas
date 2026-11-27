import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { claimDailyCheckin, dailyCheckinStatus } from "@/lib/rewards";
import { friendlyError } from "@/lib/supabase";

export function DailyCheckin({ onNameRequired }: { onNameRequired: () => void }) {
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
          setClaimed(value.claimed);
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
  }, []);
  const claim = async () => {
    if (busy || availability !== "ready") return;
    setBusy(true);
    try {
      const awarded = await claimDailyCheckin();
      setClaimed(true);
      if (awarded) toast.success(`Daily gift: +${reward} stars!`);
      else toast.info("You've already collected today's gift. Come back tomorrow!");
    } catch (error) {
      if ((error as { message?: string }).message?.includes("name_required")) onNameRequired();
      else if ((error as { message?: string }).message === "daily_unavailable") {
        setAvailability("unavailable");
        setLoadError(friendlyError(error));
      } else toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3">
      <div className="flex items-center gap-3">
        <Gift className="size-7 shrink-0 text-amber-600" />
        <div>
          <p className="font-display font-semibold text-slate-800">Daily gift</p>
          <p className="text-xs text-slate-500">
            {availability === "loading"
              ? "Checking today's gift…"
              : availability === "unavailable"
                ? loadError
                : claimed
                  ? "Collected! Come back tomorrow."
                  : `Check in today for ${reward} stars.`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void claim()}
        disabled={busy || availability !== "ready" || claimed === true}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {availability === "loading"
          ? "Checking…"
          : availability === "unavailable"
            ? "Unavailable"
            : claimed
              ? "Collected"
              : `Claim +${reward}`}
      </button>
    </div>
  );
}
