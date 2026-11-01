import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  createProject,
  initProjectStore,
  listProjects,
  PROJECTS_CHANGED_EVENT,
  type PaintProject,
} from "@/lib/projects";
import background1 from "@/assets/backgound/background1.webp";
import type { GallerySection, ProjectFilter, ProjectSort } from "./projects-home/constants";
import { matchesFilter, sortProjects } from "./projects-home/utils";
import { HeroBanner } from "./projects-home/HeroBanner";
import { FilterStrip } from "./projects-home/FilterStrip";
import { EmptyLibrary } from "./projects-home/EmptyLibrary";
import { EmptyFilterState } from "./projects-home/EmptyFilterState";
import { ProjectCard } from "./projects-home/ProjectCard";
import { EncouragementBanner } from "./projects-home/EncouragementBanner";
import { PagePickerSheet, type PagePick } from "./projects-home/PagePickerSheet";
import { FeedbackSheet } from "./feedback/FeedbackSheet";
import { MessageCircleHeart } from "lucide-react";

export function ProjectsHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<PaintProject[]>([]);
  const [activeSection] = useState<GallerySection>("gallery");
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("all");
  const [activeSort, setActiveSort] = useState<ProjectSort>("newest");

  useEffect(() => {
    let cancelled = false;
    const syncProjects = () => setProjects(listProjects());

    void initProjectStore().then(() => {
      if (cancelled) return;
      syncProjects();
      setMounted(true);
    });

    window.addEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
    window.addEventListener("storage", syncProjects);
    window.addEventListener("focus", syncProjects);

    return () => {
      cancelled = true;
      window.removeEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
      window.removeEventListener("storage", syncProjects);
      window.removeEventListener("focus", syncProjects);
    };
  }, []);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleCreateProject = () => setPickerOpen(true);

  const handlePick = (pick: PagePick) => {
    const project = createProject({
      name:
        pick.kind === "page"
          ? pick.page.name
          : pick.kind === "photo"
            ? `My Photo Page ${projects.length + 1}`
            : `Drawing ${projects.length + 1}`,
      preferBlankCanvas: pick.kind === "blank",
      images: pick.kind === "photo" ? [pick.background] : [],
    });

    setPickerOpen(false);
    navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id },
      search: pick.kind === "page" ? { page: pick.page.id } : {},
    });
  };

  const filteredProjects = useMemo(
    () =>
      sortProjects(
        projects.filter(
          (project) =>
            (activeSection !== "favorites" || project.isFavorite) &&
            matchesFilter(project, activeFilter),
        ),
        activeSort,
      ),
    [activeFilter, activeSection, activeSort, projects],
  );

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-[#f9fbff] text-slate-500">
        <div className="size-10 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        <div className="text-sm font-semibold">Loading your coloring pages…</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[#f9fbff] text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 bg-[length:100%_auto] bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${background1})` }}
      />

      {/* Floating feedback button. Sits above the bottom banner on phones. */}
      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        aria-label="Tell us something"
        title="Tell us something"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-4 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_10px_24px_-6px_rgba(109,40,217,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-violet-700 active:scale-90 md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] md:right-6"
      >
        <MessageCircleHeart className="size-6 shrink-0" strokeWidth={2.2} />
      </button>

      <div className="relative mx-auto max-w-[1560px] px-3 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-4 lg:px-3 xl:px-4">
        <div className="min-w-0">
          {/* <GallerySidebar activeSection={activeSection} onSectionChange={handleSectionChange} /> */}

          <div className="min-w-0 space-y-5 px-1 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)] sm:px-3 sm:pb-36 lg:px-8">
            <HeroBanner onCreateProject={handleCreateProject} />

            {projects.length === 0 ? (
              <EmptyLibrary onCreateProject={handleCreateProject} />
            ) : (
              <>
                <EncouragementBanner />

                <FilterStrip
                  activeFilter={activeFilter}
                  onChange={setActiveFilter}
                  activeSort={activeSort}
                  onSortChange={setActiveSort}
                />

                <section className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </section>

                {filteredProjects.length === 0 && (
                  <EmptyFilterState
                    activeFilter={activeFilter}
                    showingFavorites={activeSection === "favorites" || activeFilter === "favorites"}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <PagePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onPick={handlePick} />
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      {/* <BottomTabNav activeSection={activeSection} onSectionChange={handleSectionChange} /> */}
    </main>
  );
}
