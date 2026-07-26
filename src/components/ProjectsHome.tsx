import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  createProject,
  listProjects,
  PROJECTS_CHANGED_EVENT,
  type PaintProject,
} from "@/lib/projects";
import background1 from "@/assets/backgound/background1.png";
import type { GallerySection, ProjectFilter, ProjectSort } from "./projects-home/constants";
import { matchesFilter, sortProjects } from "./projects-home/utils";
import { HeroBanner } from "./projects-home/HeroBanner";
import { FilterStrip } from "./projects-home/FilterStrip";
import { EmptyLibrary } from "./projects-home/EmptyLibrary";
import { EmptyFilterState } from "./projects-home/EmptyFilterState";
import { ProjectCard } from "./projects-home/ProjectCard";
import { EncouragementBanner } from "./projects-home/EncouragementBanner";

export function ProjectsHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<PaintProject[]>([]);
  const [activeSection] = useState<GallerySection>("gallery");
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("all");
  const [activeSort, setActiveSort] = useState<ProjectSort>("newest");

  useEffect(() => {
    setMounted(true);

    const syncProjects = () => setProjects(listProjects());
    syncProjects();

    window.addEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
    window.addEventListener("storage", syncProjects);
    window.addEventListener("focus", syncProjects);

    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
      window.removeEventListener("storage", syncProjects);
      window.removeEventListener("focus", syncProjects);
    };
  }, []);

  const handleCreateProject = () => {
    const project = createProject({
      name: `Coloring Page ${projects.length + 1}`,
    });

    navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id },
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
      <div className="fixed inset-0 flex items-center justify-center bg-[#fbfcfe] text-slate-500">
        <div className="text-sm font-medium">Loading coloring pages...</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[#f9fbff] text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 bg-[length:100%_auto] bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${background1})` }}
      />

      <div className="relative mx-auto max-w-[1560px] px-3 py-3 sm:px-4 lg:px-3 xl:px-4">
        <div className="min-w-0">
          {/* <GallerySidebar activeSection={activeSection} onSectionChange={handleSectionChange} /> */}

          <div className="min-w-0 space-y-5 px-2 pb-32 sm:px-3 sm:pb-36 lg:px-8">
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

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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

      {/* <BottomTabNav activeSection={activeSection} onSectionChange={handleSectionChange} /> */}
    </main>
  );
}
