import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, Send, Star, Trophy, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  compressForUpload,
  contestPhase,
  fetchContest,
  formatCountdown,
  formatResultsDay,
  JUDGE_NAME,
  submitEntry,
  type Contest,
} from "@/lib/contests";
import { getProject, recordContestSubmission } from "@/lib/projects";
import { friendlyError } from "@/lib/supabase";
import { renderDrawing } from "@/components/paint/paintUtils";
import { PAINT_HEADER_SLOT_ID, PAINT_MOBILE_SLOT_ID } from "@/components/paint/headerSlot";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { KID_PRIMARY_BUTTON, KID_SHEET_CLASS } from "@/components/kid/GrownUpGate";
import { useNow } from "./useContestData";

type Step = "preview" | "sending" | "done" | "error";

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** The editor header renders after the lazy editor loads (and swaps on rotate), so watch for it. */
function useHeaderSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => {
      const next =
        document.getElementById(PAINT_MOBILE_SLOT_ID) ??
        document.getElementById(PAINT_HEADER_SLOT_ID);
      setSlot((current) => (current === next ? current : next));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return slot;
}

/** "Send" button in the editor header for contest projects (never on top of the drawing). */
export function ContestSubmitBar({ projectId }: { projectId: string }) {
  const contestId = getProject(projectId)?.contestId;
  const [contest, setContest] = useState<Contest | null>(null);
  const [open, setOpen] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(
    () => getProject(projectId)?.submission?.submittedAt,
  );
  const now = useNow(30_000);

  useEffect(() => {
    if (!contestId) return;
    void fetchContest(contestId)
      .then(setContest)
      .catch(() => setContest(null));
  }, [contestId]);

  const slot = useHeaderSlot();

  if (!contestId || !contest || contestPhase(contest, now) !== "live" || !slot) return null;

  return (
    <>
      {createPortal(
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${submittedAt ? "Send again" : "Send to contest"}, ${formatCountdown(contest.ends_at, now)} left`}
          className="flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400 pl-2.5 pr-3 font-display text-sm font-semibold text-amber-950 shadow-[0_8px_18px_-10px_rgba(180,120,0,0.8)] transition-transform active:scale-95 sm:h-11 sm:px-4 sm:text-[15px] lg:gap-2 lg:pr-2"
        >
          <Trophy className="size-4" />
          {submittedAt ? "Send again" : "Send"}
          <span className="hidden rounded-full bg-amber-950/10 px-2 py-0.5 text-xs lg:inline">
            {formatCountdown(contest.ends_at, now)}
          </span>
        </button>,
        slot,
      )}
      <SubmitSheet
        open={open}
        onOpenChange={setOpen}
        contest={contest}
        projectId={projectId}
        resend={Boolean(submittedAt)}
        onSubmitted={setSubmittedAt}
      />
    </>
  );
}

function SubmitSheet({
  open,
  onOpenChange,
  contest,
  projectId,
  resend,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest: Contest;
  projectId: string;
  resend: boolean;
  onSubmitted: (at: string) => void;
}) {
  const [step, setStep] = useState<Step>("preview");
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setImage(null);
    let cancelled = false;
    void (async () => {
      const canvas = await renderDrawing();
      if (!canvas || cancelled) return;
      const blob = await compressForUpload(canvas);
      if (!cancelled) setImage({ blob, url: URL.createObjectURL(blob) });
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  const send = async () => {
    if (!image) return;
    setStep("sending");
    try {
      // Copy 1: on this device, exactly what was sent.
      const submittedAt = new Date().toISOString();
      recordContestSubmission(projectId, {
        contestId: contest.id,
        submittedAt,
        image: await blobToDataUrl(image.blob),
      });
      // Copy 2: uploaded for the judges.
      await submitEntry(contest.id, image.blob);
      onSubmitted(submittedAt);
      setStep("done");
    } catch (err) {
      setError(friendlyError(err));
      setStep("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => step !== "sending" && onOpenChange(next)}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={KID_SHEET_CLASS}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <DialogClose
            aria-label="Close"
            disabled={step === "sending"}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </DialogClose>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6">
          {step === "preview" && (
            <div className="text-center">
              <DialogTitle className="font-display text-2xl font-semibold text-slate-800">
                {resend ? "Send your new drawing?" : "Send your drawing?"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {contest.title}
              </DialogDescription>
              <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                {image ? (
                  <img
                    src={image.url}
                    alt="Your drawing"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Loader2 className="size-7 animate-spin text-violet-500" />
                )}
              </div>
              <ContestRules contest={contest} resend={resend} />
              <button
                type="button"
                disabled={!image}
                onClick={() => void send()}
                className={`mt-5 ${KID_PRIMARY_BUTTON}`}
              >
                <Send className="size-5" />
                {resend ? "Send again" : "Send it!"}
              </button>
            </div>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-10 animate-spin text-violet-500" />
              <DialogTitle className="font-display text-xl font-semibold text-slate-700">
                Sending to {JUDGE_NAME}…
              </DialogTitle>
              <DialogDescription className="sr-only">Uploading your drawing</DialogDescription>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
                <CheckCircle2 className="size-11" />
              </span>
              <DialogTitle className="mt-3 font-display text-2xl font-semibold text-slate-800">
                Your drawing is in!
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {JUDGE_NAME} will pick the winners on {formatResultsDay(contest)}.
              </DialogDescription>
              {!resend && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                  <Star className="size-4 fill-amber-400 text-amber-500" />
                  +5 stars for joining. Good luck!
                </p>
              )}
              <Link
                to="/contests/$contestId"
                params={{ contestId: contest.id }}
                className={`mt-5 ${KID_PRIMARY_BUTTON}`}
              >
                See the contest
              </Link>
            </div>
          )}

          {step === "error" && (
            <div className="py-4 text-center">
              <DialogTitle className="font-display text-2xl font-semibold text-slate-800">
                Oops!
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">{error}</DialogDescription>
              <p className="mt-2 text-xs text-slate-400">
                Your drawing is still saved on this device.
              </p>
              <button
                type="button"
                onClick={() => setStep("preview")}
                className={`mt-5 ${KID_PRIMARY_BUTTON}`}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The contest rules in kid words, right before sending. */
function ContestRules({ contest, resend }: { contest: Contest; resend: boolean }) {
  const [first, second, third] = contest.prizes;
  return (
    <ul className="mt-4 space-y-2 rounded-xl bg-amber-50 p-3 text-left text-sm text-slate-600 ring-1 ring-amber-100">
      <li className="flex gap-2">
        <span aria-hidden>🖍️</span>
        <span>
          <b className="text-slate-800">{JUDGE_NAME}</b> looks at every drawing and picks the 3
          best.
        </span>
      </li>
      <li className="flex gap-2">
        <span aria-hidden>📅</span>
        <span>
          Winners on <b className="text-slate-800">{formatResultsDay(contest)}</b>, after the
          contest ends.
        </span>
      </li>
      <li className="flex gap-2">
        <span aria-hidden>🏆</span>
        <span>
          Prizes: 🥇 {first} · 🥈 {second} · 🥉 {third} stars
          {resend ? "" : ", and +5 stars just for joining"}.
        </span>
      </li>
      <li className="flex gap-2">
        <span aria-hidden>🔁</span>
        <span>You can send again until it ends. Only your newest drawing counts.</span>
      </li>
    </ul>
  );
}
