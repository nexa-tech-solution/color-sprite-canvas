import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDownUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LayoutGrid,
  PenLine,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProject,
  deleteProject,
  listProjects,
  PROJECTS_CHANGED_EVENT,
  type PaintProject,
} from "@/lib/projects";
import background1 from "@/assets/backgound/background1.png";
import bearImage from "@/assets/core/bear.png";
import achievementsIcon from "@/assets/core/cup.png";
import favoritesIcon from "@/assets/core/star.png";
import homeIcon from "@/assets/core/home.png";
import stickersIcon from "@/assets/core/heart.png";
import littleArtistLogo from "@/assets/core/little-artist.png";
import pickColorAdventureTitle from "@/assets/core/pick-a-coloring-adventure-tight.png";
import templatesIcon from "@/assets/core/template.png";

type ProjectFilter = "all" | "recent" | "pages" | "stickers" | "finished";
type ProjectSort = "newest" | "oldest" | "name-asc" | "name-desc";

const sidebarItems = [
  { label: "My Gallery", image: homeIcon, active: true },
  { label: "Favorites", image: favoritesIcon },
  { label: "Stickers", image: stickersIcon },
  { label: "Templates", image: templatesIcon },
  { label: "Achievements", image: achievementsIcon },
];

const filterOptions = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "recent", label: "Recent", icon: Clock3 },
  { id: "pages", label: "Pages", icon: BookOpen },
  { id: "stickers", label: "Stickers", icon: Sparkles },
  { id: "finished", label: "Finished", icon: CheckCircle2 },
] as const;

const sortOptions: { id: ProjectSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
];

const cardThemes = [
  {
    progress: "from-[#8c6dff] via-[#b77ef8] to-[#ff92c9]",
    progressTrack: "bg-[#efe7ff]",
    shell: "bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(250,244,255,0.92))]",
    accent: "bg-[#fff4c7] text-[#e0a100]",
    icon: "bg-[#fff2f8] text-[#ff5ca8]",
  },
  {
    progress: "from-[#ff7ab8] via-[#ff89c0] to-[#ffb4d8]",
    progressTrack: "bg-[#ffe4f1]",
    shell: "bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(255,241,248,0.92))]",
    accent: "bg-[#ecfff3] text-[#36b86e]",
    icon: "bg-[#eef8ff] text-[#62a8ff]",
  },
  {
    progress: "from-[#55c76a] via-[#79d85e] to-[#9be159]",
    progressTrack: "bg-[#e8f8de]",
    shell: "bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,255,241,0.92))]",
    accent: "bg-[#fff2d8] text-[#e2952f]",
    icon: "bg-[#f2ffef] text-[#58c96c]",
  },
  {
    progress: "from-[#46b6ff] via-[#5dc4ff] to-[#7ed3ff]",
    progressTrack: "bg-[#e1f4ff]",
    shell: "bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,250,255,0.92))]",
    accent: "bg-[#f3ecff] text-[#8f6fff]",
    icon: "bg-[#eef9ff] text-[#46b6ff]",
  },
  {
    progress: "from-[#bf5cff] via-[#da74ff] to-[#ff93d7]",
    progressTrack: "bg-[#f4e4ff]",
    shell: "bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(251,241,255,0.92))]",
    accent: "bg-[#fff6d8] text-[#df9b15]",
    icon: "bg-[#f9f0ff] text-[#bf5cff]",
  },
];

export function ProjectsHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<PaintProject[]>([]);
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
      sortFilteredProjects(
        projects.filter((project) => matchesFilter(project, activeFilter)),
        activeSort,
      ),
    [activeFilter, activeSort, projects],
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

      <div className="relative mx-auto max-w-[1560px] px-3 py-3 sm:px-4 lg:px-5">
        <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
          <GallerySidebar />

          <div className={projects.length > 0 ? "space-y-5 pb-28" : "space-y-5"}>
            <HeroBanner onCreateProject={handleCreateProject} />

            {projects.length === 0 ? (
              <EmptyLibrary onCreateProject={handleCreateProject} />
            ) : (
              <>
                <FilterStrip
                  activeFilter={activeFilter}
                  onChange={setActiveFilter}
                  activeSort={activeSort}
                  onSortChange={setActiveSort}
                  totalProjects={filteredProjects.length}
                />

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </section>

                {filteredProjects.length === 0 && <EmptyFilterState activeFilter={activeFilter} />}

                <EncouragementBanner />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function GallerySidebar() {
  return (
    <aside className="xl:sticky xl:top-3 xl:h-[calc(100dvh-1.5rem)] xl:self-start">
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain rounded-[36px] border border-white/90 bg-white/88 p-4 shadow-soft [scrollbar-gutter:stable] backdrop-blur-xl">
        <div className="text-center">
          <img
            src={littleArtistLogo}
            alt="Little Artists Club"
            className="mx-auto h-auto w-full max-w-[7.75rem] object-contain sm:max-w-[8.5rem]"
            draggable={false}
          />
        </div>

        <nav className="mt-5 space-y-0">
          {sidebarItems.map((item) => {
            return (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all ${
                  item.active
                    ? "bg-[linear-gradient(90deg,_rgba(255,238,246,1),_rgba(255,246,251,0.92))] text-[#ff5ca8]"
                    : "text-[#5d6788] hover:bg-[#f7f9ff]"
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center">
                  <img
                    src={item.image}
                    alt=""
                    className="size-9 object-contain"
                    draggable={false}
                  />
                </span>
                <span className="text-sm font-semibold sm:text-[15px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto text-center w-full">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#f3f0ff] px-4 py-2 text-xs font-semibold text-[#8b74ff] sm:text-sm"
          >
            <Users className="size-4" />
            Parent's zone
          </button>
        </div>
      </div>
    </aside>
  );
}

function HeroBanner({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[42px] border border-transparent bg-transparent px-5 py-2 shadow-none sm:px-8 sm:py-5 lg:px-12 lg:py-6">
      <div className="relative mx-auto flex max-w-[920px] flex-col items-center text-center">
        <img
          src={pickColorAdventureTitle}
          alt="Pick a coloring adventure!"
          className="block h-auto w-full object-contain"
          draggable={false}
        />

        <p className="-mt-10 max-w-[640px] text-xs leading-relaxed text-[#5f6894] sm:text-sm">
          Start something new or continue your masterpiece. Every project stays ready for the next
          little artist moment.
        </p>

        <button
          onClick={onCreateProject}
          className="group relative mt-4 inline-flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-[linear-gradient(180deg,_#ff79c2_0%,_#ff4eaa_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_24px_44px_-22px_rgba(255,92,168,0.8)] transition-transform duration-200 hover:-translate-y-0.5 sm:px-8 sm:py-3.5 sm:text-lg"
        >
          <span className="absolute inset-[8px] rounded-full border border-dashed border-white/35" />
          <span className="relative flex size-11 items-center justify-center rounded-full bg-white text-[#ff58ab] shadow-[0_10px_22px_-16px_rgba(255,255,255,0.9)] sm:size-[3.25rem]">
            <Plus className="size-6 sm:size-7" />
          </span>
          <span className="relative">New coloring page</span>
          <Sparkles className="relative size-5 text-white/90 sm:size-6" />
        </button>
      </div>
    </section>
  );
}

function FilterStrip({
  activeFilter,
  onChange,
  activeSort,
  onSortChange,
  totalProjects,
}: {
  activeFilter: ProjectFilter;
  onChange: (filter: ProjectFilter) => void;
  activeSort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
  totalProjects: number;
}) {
  const activeSortLabel =
    sortOptions.find((option) => option.id === activeSort)?.label ?? "Newest first";

  return (
    <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 rounded-[30px] border border-white/90 bg-white/88 p-2 shadow-soft backdrop-blur-md">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const active = activeFilter === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                active
                  ? "bg-[linear-gradient(180deg,_#ff7ab8,_#ff58ab)] text-white shadow-[0_16px_26px_-20px_rgba(255,88,171,0.85)]"
                  : "text-[#5f688f] hover:bg-[#f8faff]"
              }`}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Sort projects"
              className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-white bg-white/95 px-4 py-2.5 text-xs font-semibold text-[#505a80] shadow-[0_12px_26px_-16px_rgba(79,88,128,0.45)] transition-colors hover:bg-[#faf9ff] sm:text-sm"
            >
              <ArrowDownUp className="size-4 text-[#8f6fff]" />
              <span>{activeSortLabel}</span>
              <ChevronDown className="ml-1 size-4 text-[#505a80] transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-[190px] rounded-[20px] border border-white/90 bg-white/95 p-2 text-[#505a80] shadow-[0_22px_50px_-24px_rgba(72,80,118,0.5)] backdrop-blur-xl"
          >
            <DropdownMenuRadioGroup
              value={activeSort}
              onValueChange={(value) => onSortChange(value as ProjectSort)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.id}
                  value={option.id}
                  className="cursor-pointer rounded-[14px] py-2.5 pl-8 pr-3 text-xs font-semibold focus:bg-[#f6f3ff] focus:text-[#755de8] sm:text-sm"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}

function EmptyLibrary({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="overflow-hidden rounded-[38px] border border-white/90 bg-white/92 p-6 shadow-soft backdrop-blur-md sm:p-8">
      <div className="flex flex-col items-center rounded-[30px] bg-[linear-gradient(135deg,_rgba(255,245,251,0.98),_rgba(238,247,255,0.96))] px-5 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-white text-[#ff66b2] shadow-[0_20px_36px_-24px_rgba(255,102,178,0.7)]">
          <PenLine className="size-7" />
        </div>
        <h2 className="mt-5 text-[1.7rem] font-black tracking-[-0.06em] text-[#2d3760] sm:text-3xl">
          Your first coloring page starts here.
        </h2>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#6a7897] sm:text-sm">
          Tap the big pink button to open a fresh page, choose a picture, and build a cozy gallery
          for every little masterpiece.
        </p>
        <button
          onClick={onCreateProject}
          className="mt-6 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(180deg,_#ff7ab8,_#ff58ab)] px-6 py-3 text-xs font-bold text-white shadow-[0_24px_38px_-24px_rgba(255,88,171,0.8)] transition-transform duration-200 hover:-translate-y-0.5 sm:text-sm"
        >
          <Plus className="size-5" />
          Make a new coloring page
        </button>
      </div>
    </section>
  );
}

function EmptyFilterState({ activeFilter }: { activeFilter: ProjectFilter }) {
  return (
    <section className="rounded-[30px] border border-dashed border-[#e8ebf8] bg-white/70 px-6 py-10 text-center text-[#6c7998] shadow-soft">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff2f8] text-[#ff63af]">
        <Sparkles className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#314061] sm:text-xl">
        No projects in {activeFilter} yet
      </h2>
      <p className="mt-2 text-xs sm:text-sm">
        Try another filter or create a fresh page to start a new adventure.
      </p>
    </section>
  );
}

function ProjectCard({ project }: { project: PaintProject }) {
  const metrics = getProjectMetrics(project);

  return (
    <article
      className={`group relative overflow-hidden rounded-[30px] border border-white/90 p-3 shadow-soft backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-float ${metrics.theme.shell}`}
    >
      <div className="absolute left-3 top-3 z-10">
        <div
          className={`flex size-10 items-center justify-center rounded-full ${metrics.theme.accent}`}
        >
          <Star className={`size-4 ${metrics.favorite ? "fill-current" : ""}`} />
        </div>
      </div>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-white/92 text-[#ff67b2] shadow-[0_16px_28px_-22px_rgba(100,120,160,0.4)]">
          <PenLine className="size-4" />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label={`Delete ${project.name}`}
              title={`Delete ${project.name}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/92 text-[#ff6a83] shadow-[0_16px_28px_-22px_rgba(100,120,160,0.4)] transition-colors hover:bg-[#fff0f3]"
            >
              <Trash2 className="size-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[calc(100%-32px)] max-w-[380px] rounded-[28px] border border-white/90 bg-white/95 p-5 text-[#17243a] shadow-[0_28px_70px_-36px_rgba(23,36,58,0.65)] backdrop-blur-md sm:rounded-[28px]">
            <AlertDialogHeader className="space-y-3 text-left">
              <div className="flex size-10 items-center justify-center rounded-[15px] bg-[#fff1f1] text-[#d66b73]">
                <Trash2 className="size-5" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold tracking-normal text-[#17243a]">
                Delete project?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-[#697b9a]">
                This will permanently delete "{project.name}" from your gallery. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
              <AlertDialogCancel className="mt-0 rounded-[14px] border-0 bg-[#f1f4f8] px-4 py-2 text-sm font-semibold text-[#667a9c] shadow-none hover:bg-[#e8edf5] hover:text-[#17243a]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProject(project.id)}
                className="rounded-[14px] bg-[#ff6a83] px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-[#f04f6d]"
              >
                Delete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="flex h-full flex-col"
      >
        <ProjectThumbnail project={project} />

        <div className="mt-4 min-w-0 px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[1.3rem] font-black tracking-[-0.07em] text-[#27304d] sm:text-[1.45rem]">
                {project.name}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-[#8390ac] sm:text-xs">
                Updated {formatProjectDate(project.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatPill icon={BookOpen} label="Pages" value={metrics.coloringPageCount} />
          <StatPill icon={Sparkles} label="Stickers" value={metrics.stickerCount} />
          <StatPill icon={PenLine} label="Colors" value={metrics.strokeCount} />
        </div>

        <div className="mt-4 rounded-[20px] bg-white/80 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm">
            <span className="text-[#55617d]">{metrics.statusLabel}</span>
            <span className="text-[#25314f]">{metrics.progressLabel}</span>
          </div>
          <div className={`mt-3 h-3 rounded-full ${metrics.theme.progressTrack}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${metrics.theme.progress}`}
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}

function ProjectThumbnail({ project }: { project: PaintProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasContent = project.images.length > 0 || project.strokes.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    let cancelled = false;

    const drawThumbnail = async () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = 560;
      const height = 560;
      canvas.width = width;
      canvas.height = height;

      const bounds = getProjectBounds(project);
      const scale = Math.min((width - 68) / bounds.width, (height - 68) / bounds.height);
      const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
      const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

      const loadedImages = await Promise.all(
        project.images.map(async (image) => ({
          id: image.id,
          element: await loadThumbnailImage(image.src, image.originalSrc),
        })),
      );

      if (cancelled) return;

      const imageElements = new Map(
        loadedImages
          .filter((entry) => entry.element !== null)
          .map((entry) => [entry.id, entry.element!]),
      );

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);

      drawThumbnailImages(
        context,
        project.images.filter((image) => !image.isOutline && image.kind !== "sticker"),
        imageElements,
      );
      drawThumbnailStrokes(context, project);
      drawThumbnailImages(
        context,
        project.images.filter((image) => image.isOutline && image.kind !== "sticker"),
        imageElements,
        true,
      );
      drawThumbnailImages(
        context,
        project.images.filter((image) => image.kind === "sticker"),
        imageElements,
      );

      context.restore();
    };

    void drawThumbnail();

    return () => {
      cancelled = true;
    };
  }, [hasContent, project]);

  return (
    <div className="relative aspect-[1/1] overflow-hidden">
      <div className="absolute inset-x-7 bottom-4 h-5 rounded-full bg-[#dbe6f8]/55 blur-md" />

      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_20px_35px_-28px_rgba(83,105,155,0.42)]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Thumbnail of ${project.name}`}
          className="h-full w-full"
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center text-[#a4b1c7]">
            <PenLine className="size-5 opacity-70" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] bg-white/78 px-3 py-2 shadow-[0_14px_24px_-22px_rgba(80,96,140,0.38)]">
      <div className="flex items-center gap-1.5 text-[#5a6a8d]">
        <Icon className="size-3.5 text-[#6ab2ff]" />
        <span className="text-xs font-bold sm:text-sm">{value}</span>
      </div>
      <div className="mt-1 text-[10px] font-medium text-[#98a3bc] sm:text-[11px]">{label}</div>
    </div>
  );
}

function EncouragementBanner() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 sm:px-4 lg:px-5">
      <div className="mx-auto grid max-w-[1560px] xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-5">
        <div className="hidden xl:block" aria-hidden="true" />

        <section className="pointer-events-auto relative mx-auto flex w-full max-w-[600px] items-center gap-4 overflow-hidden rounded-[30px] border border-white/95 bg-white/95 px-1 py-2 shadow-[0_6px_16px_-8px_rgba(73,86,130,0.2),0_18px_38px_-20px_rgba(73,86,130,0.42)] backdrop-blur-xl sm:px-6">
          <div className="h-14 w-[4.5rem] shrink-0 overflow-hidden sm:h-16 sm:w-20">
            <img
              src={bearImage}
              alt="Cheerful bear"
              className="h-full w-full scale-110 object-cover mix-blend-multiply"
              draggable={false}
            />
          </div>

          <div className="min-w-0 pr-8">
            <h2 className="text-sm font-black tracking-[-0.025em] text-[#ff5ca8] sm:text-base">
              Great job, artist!
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[#4f5878] sm:text-sm">
              Keep coloring and creating amazing things!
            </p>
          </div>

          <Sparkles className="absolute right-5 top-4 size-5 fill-[#ffd448] text-[#ffd448] sm:size-6" />
        </section>
      </div>
    </div>
  );
}

function getProjectBounds(project: PaintProject) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const image of project.images) {
    minX = Math.min(minX, image.x);
    minY = Math.min(minY, image.y);
    maxX = Math.max(maxX, image.x + image.width);
    maxY = Math.max(maxY, image.y + image.height);
  }

  for (const stroke of project.strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x - stroke.size);
      minY = Math.min(minY, point.y - stroke.size);
      maxX = Math.max(maxX, point.x + stroke.size);
      maxY = Math.max(maxY, point.y + stroke.size);
    }
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return { minX: 0, minY: 0, width: 1, height: 1 };
  }

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

async function loadThumbnailImage(src: string, fallbackSrc?: string) {
  const sources = [src, fallbackSrc].filter(Boolean) as string[];

  for (const candidate of sources) {
    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = candidate;
    });

    if (loaded) {
      return loaded;
    }
  }

  return null;
}

function drawThumbnailImages(
  context: CanvasRenderingContext2D,
  images: PaintProject["images"],
  imageElements: Map<string, HTMLImageElement>,
  multiply = false,
) {
  for (const image of images) {
    const element = imageElements.get(image.id);
    if (!element) continue;

    context.save();
    context.globalAlpha = image.opacity;
    context.globalCompositeOperation = multiply ? "multiply" : "source-over";
    context.drawImage(element, image.x, image.y, image.width, image.height);
    context.restore();
  }
}

function drawThumbnailStrokes(context: CanvasRenderingContext2D, project: PaintProject) {
  for (const stroke of project.strokes) {
    if (stroke.points.length === 0) continue;

    context.save();
    context.globalAlpha = stroke.opacity;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size;
    context.globalCompositeOperation =
      stroke.tool === "eraser"
        ? "destination-out"
        : stroke.tool === "marker"
          ? "multiply"
          : "source-over";
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;

    if (stroke.points.length === 1) {
      const [point] = stroke.points;
      context.beginPath();
      context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
      continue;
    }

    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const point = stroke.points[index];
      const nextPoint = stroke.points[index + 1];
      const middleX = (point.x + nextPoint.x) / 2;
      const middleY = (point.y + nextPoint.y) / 2;
      context.quadraticCurveTo(point.x, point.y, middleX, middleY);
    }

    const lastPoint = stroke.points.at(-1)!;
    context.lineTo(lastPoint.x, lastPoint.y);
    context.stroke();
    context.restore();
  }
}

function getProjectMetrics(project: PaintProject) {
  const importedImageCount = project.images.filter(
    (image) => image.kind !== "sticker" && image.kind !== "coloring-page",
  ).length;
  const coloringPageCount = project.images.filter((image) => image.kind === "coloring-page").length;
  const stickerCount = project.images.filter((image) => image.kind === "sticker").length;
  const strokeCount = project.strokes.length;
  const hasContent = project.images.length > 0 || strokeCount > 0;

  const rawProgress =
    coloringPageCount * 24 +
    importedImageCount * 18 +
    Math.min(26, stickerCount * 4) +
    Math.min(42, strokeCount * 4);

  const progress = hasContent ? Math.min(100, Math.max(18, rawProgress)) : 0;
  const theme = cardThemes[hashString(project.id) % cardThemes.length];
  const favorite = stickerCount > 0 || progress >= 72;

  return {
    importedImageCount,
    coloringPageCount,
    stickerCount,
    strokeCount,
    progress,
    theme,
    favorite,
    progressLabel: progress >= 100 ? "100%" : `${progress}%`,
    statusLabel:
      progress >= 90
        ? "Finished"
        : progress >= 70
          ? "Almost done"
          : progress >= 40
            ? "Looking bright"
            : "Just started",
  };
}

function matchesFilter(project: PaintProject, filter: ProjectFilter) {
  const metrics = getProjectMetrics(project);
  const updatedAt = new Date(project.updatedAt).getTime();
  const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;

  switch (filter) {
    case "recent":
      return Number.isFinite(updatedAt) && updatedAt >= threeDaysAgo;
    case "pages":
      return metrics.coloringPageCount > 0 || metrics.importedImageCount > 0;
    case "stickers":
      return metrics.stickerCount > 0;
    case "finished":
      return metrics.progress >= 90;
    case "all":
    default:
      return true;
  }
}

function sortFilteredProjects(projects: PaintProject[], sort: ProjectSort) {
  return [...projects].sort((firstProject, secondProject) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(firstProject.updatedAt).getTime() - new Date(secondProject.updatedAt).getTime()
        );
      case "name-asc":
        return firstProject.name.localeCompare(secondProject.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      case "name-desc":
        return secondProject.name.localeCompare(firstProject.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      case "newest":
      default:
        return (
          new Date(secondProject.updatedAt).getTime() - new Date(firstProject.updatedAt).getTime()
        );
    }
  });
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function formatProjectDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
