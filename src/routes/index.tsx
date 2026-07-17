import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "sonner";

const PaintApp = lazy(() =>
  import("@/components/paint/PaintApp").then((m) => ({ default: m.PaintApp })),
);

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      {mounted ? (
        <Suspense fallback={<Loading />}>
          <PaintApp />
        </Suspense>
      ) : (
        <Loading />
      )}
      <Toaster position="top-center" richColors />
    </>
  );
}

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-paint-canvas dot-grid">
      <div className="animate-pulse text-slate-400 text-sm font-medium">Loading canvas…</div>
    </div>
  );
}
