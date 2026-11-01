import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { isNameAvailable, setPlayerName, usePlayerStore } from "@/lib/player";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { KID_PRIMARY_BUTTON, KID_SHEET_CLASS } from "@/components/kid/GrownUpGate";

const MAX = 24;
const FUN_WORDS = ["Star", "Rainbow", "Sunny", "Bubbles", "Sparkle", "Tiger", "Bunny", "Panda"];

function suggestNames(base: string) {
  const word = () => FUN_WORDS[Math.floor(Math.random() * FUN_WORDS.length)];
  const number = () => 2 + Math.floor(Math.random() * 98);
  const ideas = new Set([`${base} ${word()}`, `${word()} ${base}`, `${base}${number()}`]);
  return [...ideas].map((idea) => idea.slice(0, MAX));
}

/** "What's your name?" — first launch, or tapping the name in the header to change it. */
export function NameSheet({
  open,
  onOpenChange,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** First launch: must pick a name (no close). */
  dismissible?: boolean;
}) {
  const current = usePlayerStore((state) => state.name);
  const [value, setValue] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [taken, setTaken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setValue(current ?? "");
    setTaken(null);
    setSuggestions([]);
  }, [open, current]);

  const name = value.trim();
  const unchanged = Boolean(current) && name.toLowerCase() === current!.trim().toLowerCase();

  const save = async () => {
    if (!name || saving) return;
    if (unchanged) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const result = await setPlayerName(name);
      if (result === "taken") {
        setTaken(name);
        // Offer ideas that are actually free.
        const ideas = suggestNames(name);
        const free = await Promise.all(ideas.map(isNameAvailable));
        setSuggestions(ideas.filter((_, index) => free[index]));
        return;
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (dismissible || next) && onOpenChange(next)}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => !dismissible && event.preventDefault()}
        onPointerDownOutside={(event) => !dismissible && event.preventDefault()}
        className={KID_SHEET_CLASS}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
        <form
          className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5 text-center sm:pb-6 sm:pt-7"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-500">
            <Sparkles className="size-8" strokeWidth={2.2} />
          </span>
          <DialogTitle className="mt-3 font-display text-2xl font-semibold text-slate-800">
            {current ? "Change your name" : "Hi, artist! What's your name?"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Your name shows on your drawings and in contests. A nickname is great!
          </DialogDescription>
          <input
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value.slice(0, MAX));
              setTaken(null);
            }}
            aria-invalid={Boolean(taken)}
            placeholder="Your nickname"
            autoComplete="nickname"
            enterKeyHint="done"
            className="mt-5 h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 text-center font-display text-xl font-semibold text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:bg-white aria-[invalid=true]:border-rose-300"
          />
          {taken && (
            <div className="mt-3" role="status">
              <p className="text-sm font-semibold text-rose-500">
                Another artist already uses “{taken}”. Try a different one!
              </p>
              {suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {suggestions.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        setValue(idea);
                        setTaken(null);
                      }}
                      className="cursor-pointer rounded-full border-2 border-violet-200 bg-violet-50 px-3.5 py-1.5 font-display text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 active:scale-95"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={!name || saving || Boolean(taken)}
            className={`mt-4 ${KID_PRIMARY_BUTTON}`}
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : current ? "Save" : "Let's go!"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
