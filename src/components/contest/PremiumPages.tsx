import { useEffect, useState } from "react";
import { Lock, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { PREMIUM_PAGES, coloringPageThumbToSrc, type ColoringPage } from "@/lib/coloringPages";
import { buyPremiumPage, fetchPremiumPrices } from "@/lib/contests";
import { initPlayer, playerFeaturesEnabled, usePlayerStore } from "@/lib/player";
import { friendlyError } from "@/lib/supabase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GrownUpGate, KID_PRIMARY_BUTTON, KID_SHEET_CLASS } from "@/components/kid/GrownUpGate";

/** Fallback when prices can't load (matches the SQL seed). */
const DEFAULT_PRICES: Record<string, number> = {
  "premium/magic-unicorn-garden": 60,
  "premium/underwater-palace": 80,
  "premium/dragon-treasure-castle": 100,
  "premium/enchanted-treehouse": 70,
  "premium/space-adventure": 50,
  "premium/candy-kingdom": 90,
};

/** "Special pages" section of the coloring book: locked until bought with stars. */
export function PremiumSection({ onPick }: { onPick: (page: ColoringPage) => void }) {
  const purchases = usePlayerStore((state) => state.purchases);
  const points = usePlayerStore((state) => state.points);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [buying, setBuying] = useState<ColoringPage | null>(null);

  useEffect(() => {
    if (!playerFeaturesEnabled) return;
    void initPlayer();
    void fetchPremiumPrices().then((loaded) => {
      if (Object.keys(loaded).length) setPrices(loaded);
    });
  }, []);

  if (!playerFeaturesEnabled || PREMIUM_PAGES.length === 0) return null;
  const forSale = PREMIUM_PAGES.filter((page) => prices[page.id] || purchases.includes(page.id));
  if (forSale.length === 0) return null;

  return (
    <>
      <div className="col-span-full mt-3 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
          Special pages
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
          <Star className="size-3.5 fill-amber-400 text-amber-500" />
          {points} stars
        </span>
      </div>
      {forSale.map((page) => {
        const owned = purchases.includes(page.id);
        return (
          <button
            key={page.id}
            type="button"
            onClick={() => (owned ? onPick(page) : setBuying(page))}
            aria-label={owned ? `Color ${page.name}` : `${page.name}, ${prices[page.id]} stars`}
            className="group relative flex cursor-pointer flex-col rounded-xl border border-amber-200 bg-white p-2 text-left transition-colors hover:border-amber-300 active:scale-[0.97]"
          >
            <span className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-white p-2">
              <img
                src={coloringPageThumbToSrc(page)}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`h-full w-full object-contain ${owned ? "" : "opacity-60 blur-[1.5px]"}`}
              />
              {!owned && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-amber-600 shadow-md">
                    <Lock className="size-6" />
                  </span>
                </span>
              )}
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 px-1">
              <span className="truncate font-display text-sm font-semibold text-slate-700">
                {page.name}
              </span>
              {!owned && (
                <span className="inline-flex shrink-0 items-center gap-0.5 font-display text-sm font-semibold text-amber-600">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  {prices[page.id]}
                </span>
              )}
            </span>
          </button>
        );
      })}

      <BuySheet
        page={buying}
        price={buying ? prices[buying.id] : 0}
        onClose={() => setBuying(null)}
        onBought={(page) => {
          setBuying(null);
          toast.success(`${page.name} is yours!`);
          onPick(page);
        }}
      />
    </>
  );
}

function BuySheet({
  page,
  price,
  onClose,
  onBought,
}: {
  page: ColoringPage | null;
  price: number;
  onClose: () => void;
  onBought: (page: ColoringPage) => void;
}) {
  const points = usePlayerStore((state) => state.points);
  const [step, setStep] = useState<"look" | "grown-up" | "buying">("look");
  const [error, setError] = useState("");

  useEffect(() => {
    if (page) {
      setStep("look");
      setError("");
    }
  }, [page]);

  const enough = points >= price;

  const buy = async () => {
    if (!page) return;
    setStep("buying");
    try {
      await buyPremiumPage(page.id);
      onBought(page);
    } catch (err) {
      setError(friendlyError(err));
      setStep("look");
    }
  };

  return (
    <Dialog open={Boolean(page)} onOpenChange={(next) => !next && step !== "buying" && onClose()}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={KID_SHEET_CLASS}
      >
        <div className="flex justify-end px-3 pt-3">
          <DialogClose
            aria-label="Close"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </DialogClose>
        </div>
        {page && (
          <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6">
            {step === "grown-up" ? (
              <GrownUpGate
                description={`Answer to spend ${price} stars on ${page.name}.`}
                onPass={() => void buy()}
              />
            ) : (
              <div className="text-center">
                <img
                  src={coloringPageThumbToSrc(page)}
                  alt={page.name}
                  className="mx-auto h-56 rounded-xl bg-white object-contain ring-1 ring-slate-100"
                />
                <DialogTitle className="mt-3 font-display text-2xl font-semibold text-slate-800">
                  {page.name}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  A special page with lots of details. Yours forever on this device.
                </DialogDescription>
                {error && <p className="mt-2 text-sm font-semibold text-rose-500">{error}</p>}
                {!enough && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    You have {points} stars. Join contests to win {price - points} more!
                  </p>
                )}
                <button
                  type="button"
                  disabled={!enough || step === "buying"}
                  onClick={() => setStep("grown-up")}
                  className={`mt-5 ${KID_PRIMARY_BUTTON}`}
                >
                  {step === "buying" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      Unlock for
                      <Star className="size-5 fill-amber-300 text-amber-300" />
                      {price}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
