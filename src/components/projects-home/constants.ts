import achievementsIcon from "@/assets/core/cup.png";
import favoritesIcon from "@/assets/core/star.png";
import homeIcon from "@/assets/core/home.png";
import stickersIcon from "@/assets/core/heart.png";
import templatesIcon from "@/assets/core/template.png";

export type ProjectFilter = "all" | "recent" | "pages" | "favorites" | "finished";
export type ProjectSort = "newest" | "oldest" | "name-asc" | "name-desc";
export type GallerySection = "gallery" | "favorites";

export const sidebarItems = [
  { id: "gallery", label: "My Gallery", image: homeIcon },
  { id: "favorites", label: "Favorites", image: favoritesIcon },
  { id: "stickers", label: "Stickers", image: stickersIcon },
  { id: "templates", label: "Templates", image: templatesIcon },
  { id: "achievements", label: "Achievements", image: achievementsIcon },
];

export const filterOptions = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "pages", label: "Pages" },
  { id: "favorites", label: "Favorites" },
  { id: "finished", label: "Finished" },
] as const;

export const sortOptions: { id: ProjectSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
];

export const cardThemes = [
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
