import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { calculateProjectProgress } from "@/lib/projectProgress";
import {
  flushProjectWrites,
  getProject,
  initProjectStore,
  saveProject,
  STORAGE_ERROR_EVENT,
  updateProjectProgress,
} from "@/lib/projects";
import { projectFromState, usePaintStore } from "@/stores/paintStore";

const PaintApp = lazy(() =>
  import("@/components/paint/PaintApp").then((module) => ({ default: module.PaintApp })),
);

export const Route = createFileRoute("/projects/$projectId")({
  // `page`: coloring page picked on the home screen for a brand-new project.
  validateSearch: (search: Record<string, unknown>): { page?: string } =>
    typeof search.page === "string" ? { page: search.page } : {},
  component: ProjectEditor,
});

function ProjectEditor() {
  const { projectId } = Route.useParams();
  const { page: startPageId } = Route.useSearch();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const projectName = usePaintStore((state) => state.currentProjectName);

  useEffect(() => {
    let cancelled = false;
    void initProjectStore().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let lastToastAt = 0;
    const onStorageError = () => {
      const now = Date.now();
      if (now - lastToastAt < 15_000) return;
      lastToastAt = now;
      toast.error("Couldn't save your drawing. Free up some space on your device and try again.");
    };
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const project = getProject(projectId);
    if (!project) {
      navigate({ to: "/" });
      return;
    }

    usePaintStore.getState().loadProject(project);
    // The page was already chosen on the home screen — no welcome card needed.
    if (startPageId) usePaintStore.getState().dismissWelcome();
    setReady(true);

    void calculateProjectProgress(project).then((progress) => {
      updateProjectProgress(project.id, progress, project.updatedAt);
    });
    // startPageId only matters on first load of this project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, navigate, projectId]);

  useEffect(() => {
    if (!ready) return;

    let timeoutId: number | undefined;
    let dirty = false;

    const saveNow = () => {
      window.clearTimeout(timeoutId);
      if (!dirty) return;
      dirty = false;
      const snapshot = projectFromState(usePaintStore.getState());
      if (snapshot && snapshot.id === projectId) {
        saveProject(snapshot);
      }
    };

    const unsubscribe = usePaintStore.subscribe((state, previous) => {
      if (!state.isProjectLoaded || state.currentProjectId !== projectId) return;
      // Only content changes need saving — skip tool/colour/selection churn.
      if (
        state.strokes === previous.strokes &&
        state.images === previous.images &&
        state.currentProjectName === previous.currentProjectName &&
        state.transform === previous.transform &&
        state.preferBlankCanvas === previous.preferBlankCanvas
      ) {
        return;
      }

      dirty = true;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(saveNow, 400);
    });

    // iOS may suspend or kill the WebView as soon as the app is backgrounded,
    // so write immediately instead of waiting for the debounce.
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        saveNow();
        void flushProjectWrites();
      }
    };
    const onPageHide = () => {
      saveNow();
      void flushProjectWrites();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.clearTimeout(timeoutId);
      const snapshot = projectFromState(usePaintStore.getState());
      if (snapshot && snapshot.id === projectId) {
        const savedProject = saveProject(snapshot);
        void calculateProjectProgress(savedProject).then((progress) => {
          updateProjectProgress(savedProject.id, progress, savedProject.updatedAt);
        });
      }
      unsubscribe();
    };
  }, [projectId, ready]);

  useEffect(() => {
    if (!ready) return;
    document.title = `${projectName} | Coloring`;
  }, [projectName, ready]);

  if (!mounted || !ready) {
    return <Loading label="Loading canvas…" />;
  }

  return (
    <>
      <Suspense fallback={<Loading label="Loading canvas…" />}>
        <PaintApp startPageId={startPageId} />
      </Suspense>
      <Toaster position="top-center" richColors />
    </>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-paint-canvas dot-grid">
      <div className="animate-pulse text-sm font-medium text-slate-400">{label}</div>
    </div>
  );
}
