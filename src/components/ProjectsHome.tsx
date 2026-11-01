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
import { AppNav, useNavPageClass } from "./nav/AppNav";
import { playerFeaturesEnabled, usePlayerStore } from "@/lib/player";
import { pickFeaturedContest } from "@/lib/contests";
import { NameSheet } from "./contest/NameSheet";
import { PlayerBar } from "./contest/PlayerBar";
import { ContestBanner, ContestBannerSkeleton } from "./contest/ContestBanner";
import { useContestData } from "./contest/useContestData";

export function ProjectsHome() {
  const navigate = useNavigate();
  const navPageClass = useNavPageClass();
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
  const [nameOpen, setNameOpen] = useState(false);
  const playerName = usePlayerStore((state) => state.name);
  const { contests, mine, loaded: contestsLoaded } = useContestData();
  const featured = useMemo(() => pickFeaturedContest(contests), [contests]);
  const playerStatus = usePlayerStore((state) => state.status);
  // Only ask once we know there's no saved name (not while it's still loading).
  const mustPickName =
    playerFeaturesEnabled &&
    mounted &&
    !playerName &&
    (playerStatus === "ready" || playerStatus === "offline");

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
        className="pointer-events-none fixed inset-x-0 top-0 aspect-[16/9] bg-[length:100%_auto] bg-top bg-no-repeat [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        style={{ backgroundImage: `url(${background1})` }}
      />

      <div
        className={`relative px-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-4 ${navPageClass}`}
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="min-w-0">
            <div className="min-w-0 space-y-5 px-1 sm:px-3 lg:px-4">
              {playerFeaturesEnabled && <PlayerBar onEditName={() => setNameOpen(true)} />}

              <HeroBanner onCreateProject={handleCreateProject} />

              {playerFeaturesEnabled && !contestsLoaded ? (
                <div className="-mx-4 sm:-mx-7 lg:-mx-8">
                  <ContestBannerSkeleton />
                </div>
              ) : (
                featured && (
                  <div className="-mx-4 sm:-mx-7 lg:-mx-8">
                    <ContestBanner
                      contest={featured}
                      entry={mine.find((entry) => entry.contest_id === featured.id)}
                    />
                  </div>
                )
              )}

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
                      showingFavorites={
                        activeSection === "favorites" || activeFilter === "favorites"
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <AppNav />
      <PagePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onPick={handlePick} />
      {playerFeaturesEnabled && (
        <NameSheet
          open={nameOpen || mustPickName}
          onOpenChange={setNameOpen}
          dismissible={!mustPickName}
        />
      )}
    </main>
  );
}
