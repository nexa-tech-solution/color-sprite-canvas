import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { calculateProjectProgress } from "@/lib/projectProgress";
import { getProject, saveProject, updateProjectProgress } from "@/lib/projects";
import { projectFromState, usePaintStore } from "@/stores/paintStore";

const PaintApp = lazy(() =>
  import("@/components/paint/PaintApp").then((module) => ({ default: module.PaintApp })),
);

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectEditor,
});

function ProjectEditor() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const projectName = usePaintStore((state) => state.currentProjectName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const project = getProject(projectId);
    if (!project) {
      navigate({ to: "/" });
      return;
    }

    usePaintStore.getState().loadProject(project);
    setReady(true);

    void calculateProjectProgress(project).then((progress) => {
      updateProjectProgress(project.id, progress, project.updatedAt);
    });
  }, [mounted, navigate, projectId]);

  useEffect(() => {
    if (!ready) return;

    let timeoutId: number | undefined;

    const unsubscribe = usePaintStore.subscribe((state) => {
      if (!state.isProjectLoaded || state.currentProjectId !== projectId) return;

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const snapshot = projectFromState(usePaintStore.getState());
        if (snapshot && snapshot.id === projectId) {
          saveProject(snapshot);
        }
      }, 180);
    });

    return () => {
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
    document.title = `${projectName} | Tiny Color Club`;
  }, [projectName, ready]);

  if (!mounted || !ready) {
    return <Loading label="Loading canvas…" />;
  }

  return (
    <>
      <Suspense fallback={<Loading label="Loading canvas…" />}>
        <PaintApp />
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
