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

/** Each artwork gets its own washi tape + crayon colour, picked by project id. */
export const cardThemes = [
  { tape: "#ffb3d4", crayon: "#ff5ca8", crayonTrack: "#ffe3f0", ink: "#c2367c" },
  { tape: "#a8dcff", crayon: "#2f9dff", crayonTrack: "#ddf0ff", ink: "#1b6fc2" },
  { tape: "#ffe08a", crayon: "#f5a300", crayonTrack: "#fff1c9", ink: "#a86b00" },
  { tape: "#b9eca6", crayon: "#3fbf5c", crayonTrack: "#def6d6", ink: "#23843a" },
  { tape: "#d5c2ff", crayon: "#8b5cf6", crayonTrack: "#ece4ff", ink: "#6338c9" },
];
