import type { ElementType } from "react";
import {
  BookOpen,
  Eraser,
  Hand,
  Highlighter,
  MousePointer2,
  Paintbrush,
  Pencil,
} from "lucide-react";
import type { ToolId } from "@/stores/paintStore";

export const TOOLS: { id: ToolId; label: string; icon: ElementType }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan (Space)", icon: Hand },
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "brush", label: "Brush", icon: Paintbrush },
  { id: "marker", label: "Marker", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

export const PALETTE = [
  "#f472b6",
  "#fb7185",
  "#fbbf24",
  "#facc15",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#f0abfc",
  "#1f2937",
  "#ffffff",
];

export const PAINT_ACTIONS = {
  pagesLabel: "Coloring pages",
  stickerShelfTitle: "Sticker book",
  pageShelfTitle: "Coloring book",
  pageReadyMessage: "is ready to color",
  importSuccessMessage: "Picture added as your coloring page background",
  exportFilePrefix: "coloring",
  defaultProjectNamePrefix: "My coloring page",
} as const;

export const PAINT_SHELF_ICONS = {
  pages: BookOpen,
};
