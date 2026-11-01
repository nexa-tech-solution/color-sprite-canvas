import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, Bug, Lightbulb, Mail, MessageCircle, Palette, X } from "lucide-react";
import {
  gmailAppUrl,
  mailtoUrl,
  needsEmailAppChoice,
  openFeedbackEmail,
  type FeedbackTopic,
} from "@/lib/feedback";
import { isNativeShell } from "@/lib/nativeBridge";
import { GrownUpGate, KID_PRIMARY_BUTTON, KID_SHEET_CLASS } from "@/components/kid/GrownUpGate";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_MESSAGE = 1200;

type Step = "topic" | "message" | "grown-up" | "pick-app";

const TOPICS: {
  id: FeedbackTopic;
  label: string;
  icon: ReactNode;
  tile: string;
  prompt: string;
  placeholder: string;
}[] = [
  {
    id: "bug",
    label: "Something is broken",
    icon: <Bug className="size-8" strokeWidth={2.2} />,
    tile: "border-rose-200 bg-rose-50 text-rose-500",
    prompt: "What went wrong?",
    placeholder: "Example: When I tap the eraser, my picture disappears…",
  },
  {
    id: "idea",
    label: "I have an idea",
    icon: <Lightbulb className="size-8" strokeWidth={2.2} />,
    tile: "border-amber-200 bg-amber-50 text-amber-500",
    prompt: "What should we add?",
    placeholder: "Example: A glitter brush!",
  },
  {
    id: "pages",
    label: "More pictures to color",
    icon: <Palette className="size-8" strokeWidth={2.2} />,
    tile: "border-emerald-200 bg-emerald-50 text-emerald-500",
    prompt: "What would you like to color?",
    placeholder: "Example: Unicorns, trucks, dinosaurs…",
  },
  {
    id: "other",
    label: "Something else",
    icon: <MessageCircle className="size-8" strokeWidth={2.2} />,
    tile: "border-sky-200 bg-sky-50 text-sky-500",
    prompt: "Tell us anything!",
    placeholder: "Write your message here…",
  },
];

/**
 * "Tell us something": pick a topic → write a message → grown-up check
 * (required before a kids app opens another app) → Gmail opens pre-filled.
 */
export function FeedbackSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState<FeedbackTopic>("idea");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("topic");
    setMessage("");
  }, [open]);

  const current = TOPICS.find((entry) => entry.id === topic) ?? TOPICS[0];
  const canContinue = message.trim().length >= 3;

  const chooseTopic = (next: FeedbackTopic) => {
    setTopic(next);
    setStep("message");
  };

  const goToGrownUp = () => setStep("grown-up");

  const send = () => {
    if (needsEmailAppChoice()) {
      setStep("pick-app");
      return;
    }
    // Still inside the tap, so the browser/OS allows opening Gmail.
    openFeedbackEmail(topic, message);
    onOpenChange(false);
  };

  const back = () =>
    setStep(step === "pick-app" ? "grown-up" : step === "grown-up" ? "message" : "topic");
  // Real links: iOS opens other apps most reliably from a direct tap on an <a>.
  // In the iOS app the WebView can't open other apps itself, so ask the shell (OPEN_URL).
  const openApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isNativeShell()) {
      event.preventDefault();
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({ type: "OPEN_URL", url: event.currentTarget.href }),
      );
    }
    window.setTimeout(() => onOpenChange(false), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={KID_SHEET_CLASS}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-2 sm:pt-4">
          {step !== "topic" ? (
            <button
              type="button"
              onClick={back}
              aria-label="Back"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <span className="size-10 shrink-0" aria-hidden />
          )}
          <StepDots index={step === "topic" ? 0 : step === "message" ? 1 : 2} />
          <DialogClose
            aria-label="Close"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="size-5" />
          </DialogClose>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6">
          {step === "topic" && (
            <>
              <DialogTitle className="text-center font-display text-2xl font-semibold text-slate-800">
                Tell us something!
              </DialogTitle>
              <DialogDescription className="mt-1 text-center text-sm text-slate-500">
                What is it about?
              </DialogDescription>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {TOPICS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => chooseTopic(entry.id)}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 px-3 py-5 transition-transform active:scale-95 ${entry.tile}`}
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
                      {entry.icon}
                    </span>
                    <span className="font-display text-[15px] font-semibold leading-tight text-slate-700">
                      {entry.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "message" && (
            <>
              <DialogTitle className="font-display text-2xl font-semibold text-slate-800">
                {current.prompt}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                A grown-up can help you write it.
              </DialogDescription>
              <textarea
                autoFocus
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE))}
                placeholder={current.placeholder}
                rows={5}
                className="mt-4 w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-3 text-base leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:bg-white"
              />
              <div className="mt-1 text-right text-xs text-slate-400">
                {message.length}/{MAX_MESSAGE}
              </div>
              <button
                type="button"
                onClick={goToGrownUp}
                disabled={!canContinue}
                className={`mt-4 ${KID_PRIMARY_BUTTON}`}
              >
                Next
              </button>
            </>
          )}

          {step === "grown-up" && (
            <GrownUpGate description="Answer to send your message by email." onPass={send} />
          )}

          {step === "pick-app" && (
            <div className="text-center">
              <DialogTitle className="font-display text-2xl font-semibold text-slate-800">
                Send with…
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Your message is ready. Pick your email app.
              </DialogDescription>
              <a
                href={gmailAppUrl(topic, message)}
                onClick={openApp}
                className={`mt-5 ${KID_PRIMARY_BUTTON}`}
              >
                <Mail className="size-5" />
                Open Gmail
              </a>
              <a
                href={mailtoUrl(topic, message)}
                onClick={openApp}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-xl font-display text-base font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
              >
                Other email app
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ index }: { index: number }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={`h-2 rounded-full transition-all ${
            dot === index
              ? "w-6 bg-violet-500"
              : dot < index
                ? "w-2 bg-violet-300"
                : "w-2 bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
