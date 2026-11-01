import { useState } from "react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

function makeQuestion() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const answer = a * b;
  const options = new Set<number>([answer]);
  while (options.size < 3) {
    const offset = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset * (Math.random() < 0.5 ? 1 : a);
    if (candidate > 0) options.add(candidate);
  }
  return { a, b, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

/**
 * Parental gate (App Store Kids category): a grown-up answers a multiplication
 * before the app sends data, opens another app, or spends stars.
 * Must be rendered inside a Dialog.
 */
export function GrownUpGate({
  description,
  onPass,
}: {
  description: string;
  /** Runs inside the tap, so it may open windows/apps. */
  onPass: () => void;
}) {
  const [question, setQuestion] = useState(makeQuestion);
  const [wrong, setWrong] = useState(false);

  const answer = (value: number) => {
    if (value !== question.answer) {
      setWrong(true);
      setQuestion(makeQuestion());
      return;
    }
    onPass();
  };

  return (
    <div className="text-center">
      <DialogTitle className="font-display text-2xl font-semibold text-slate-800">
        Ask a grown-up
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-slate-500">{description}</DialogDescription>
      <p className="mt-6 font-display text-4xl font-semibold text-slate-800">
        {question.a} × {question.b} = ?
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {question.options.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => answer(value)}
            className="h-16 cursor-pointer rounded-xl border-2 border-slate-200 bg-white font-display text-2xl font-semibold text-slate-700 transition-colors hover:border-violet-300 active:bg-violet-50"
          >
            {value}
          </button>
        ))}
      </div>
      <p
        className={`mt-3 h-5 text-sm font-semibold text-rose-500 ${wrong ? "visible" : "invisible"}`}
        role="status"
      >
        Not quite — try this one.
      </p>
    </div>
  );
}

/** Shared bottom-sheet (phone) / centred (desktop) dialog styling. */
export const KID_SHEET_CLASS =
  "bottom-0 left-0 top-auto flex max-h-[92dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 bg-white p-0 shadow-[0_-20px_60px_-30px_rgba(23,36,58,0.5)] outline-none focus:outline-none focus-visible:outline-none data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(calc(100vw-48px),460px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95";

export const KID_PRIMARY_BUTTON =
  "flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 font-display text-lg font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";
