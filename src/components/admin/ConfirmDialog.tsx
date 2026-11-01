import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { create } from "zustand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** "danger" for deletes and anything that can't be undone. */
  tone?: "danger" | "default";
};

type ConfirmState = (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;

const useConfirmStore = create<{ request: ConfirmState }>(() => ({ request: null }));

/** In-app replacement for window.confirm: resolves true on confirm, false on cancel or dismiss. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  useConfirmStore.getState().request?.resolve(false);
  return new Promise((resolve) => useConfirmStore.setState({ request: { ...options, resolve } }));
}

function settle(ok: boolean) {
  const { request } = useConfirmStore.getState();
  useConfirmStore.setState({ request: null });
  request?.resolve(ok);
}

/** Render once near the root of a screen that calls confirmAction. */
export function ConfirmHost() {
  const request = useConfirmStore((state) => state.request);
  const danger = request?.tone === "danger";
  return (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader className="sm:text-left">
          <div className="flex items-start gap-3">
            {danger && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <div className="min-w-0 space-y-1.5">
              <AlertDialogTitle className="text-lg">{request?.title}</AlertDialogTitle>
              {request?.description && (
                <AlertDialogDescription className="whitespace-pre-line text-sm leading-relaxed text-slate-500">
                  {request.description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={danger ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}
          >
            {request?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
