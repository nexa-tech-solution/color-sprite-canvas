import { create } from "zustand";

export type ToolId = "select" | "pan" | "pencil" | "brush" | "marker" | "eraser" | "image";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: "pencil" | "brush" | "marker" | "eraser";
  color: string;
  size: number;
  opacity: number;
  points: Point[];
}

export interface CanvasImage {
  id: string;
  src: string; // current displayed src (may be coloring outline)
  originalSrc: string; // preserved original
  isOutline: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface Snapshot {
  strokes: Stroke[];
  images: CanvasImage[];
}

interface PaintState {
  tool: ToolId;
  color: string;
  brushSize: number;
  opacity: number;
  recentColors: string[];

  transform: Transform;

  strokes: Stroke[];
  images: CanvasImage[];
  selectedImageId: string | null;

  showWelcome: boolean;

  history: Snapshot[];
  future: Snapshot[];

  setTool: (t: ToolId) => void;
  setColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setOpacity: (n: number) => void;
  setTransform: (t: Transform) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, cx: number, cy: number) => void;
  resetView: () => void;

  beginStroke: (s: Stroke) => void;
  extendStroke: (id: string, p: Point) => void;
  endStroke: () => void;

  addImage: (img: CanvasImage) => void;
  updateImage: (id: string, patch: Partial<CanvasImage>) => void;
  removeImage: (id: string) => void;
  selectImage: (id: string | null) => void;

  dismissWelcome: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
}

const initialTransform: Transform = { x: 0, y: 0, scale: 1 };

function snap(state: PaintState): Snapshot {
  return {
    strokes: state.strokes.map((s) => ({ ...s, points: [...s.points] })),
    images: state.images.map((i) => ({ ...i })),
  };
}

export const usePaintStore = create<PaintState>((set, get) => ({
  tool: "brush",
  color: "#f472b6",
  brushSize: 14,
  opacity: 1,
  recentColors: ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#1f2937"],

  transform: initialTransform,

  strokes: [],
  images: [],
  selectedImageId: null,

  showWelcome: true,

  history: [],
  future: [],

  setTool: (tool) =>
    set({ tool, selectedImageId: tool === "select" ? get().selectedImageId : null }),
  setColor: (color) =>
    set((s) => ({
      color,
      recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 8),
    })),
  setBrushSize: (brushSize) => set({ brushSize }),
  setOpacity: (opacity) => set({ opacity }),

  setTransform: (transform) => set({ transform }),
  panBy: (dx, dy) =>
    set((s) => ({
      transform: { ...s.transform, x: s.transform.x + dx, y: s.transform.y + dy },
    })),
  zoomAt: (factor, cx, cy) =>
    set((s) => {
      const nextScale = Math.min(8, Math.max(0.1, s.transform.scale * factor));
      const k = nextScale / s.transform.scale;
      return {
        transform: {
          scale: nextScale,
          x: cx - (cx - s.transform.x) * k,
          y: cy - (cy - s.transform.y) * k,
        },
      };
    }),
  resetView: () => set({ transform: initialTransform }),

  beginStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
      showWelcome: false,
      history: [...state.history, snap(state)].slice(-80),
      future: [],
    })),
  extendStroke: (id, p) =>
    set((st) => ({
      strokes: st.strokes.map((s) => (s.id === id ? { ...s, points: [...s.points, p] } : s)),
    })),
  endStroke: () => {},

  addImage: (img) =>
    set((s) => {
      const next = {
        ...s,
        images: [...s.images, img],
        selectedImageId: img.id,
        showWelcome: false,
      };
      return { ...next, history: [...s.history, snap(s)].slice(-80), future: [] };
    }),
  updateImage: (id, patch) =>
    set((s) => ({ images: s.images.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  removeImage: (id) =>
    set((s) => {
      const next = { images: s.images.filter((i) => i.id !== id), selectedImageId: null };
      return { ...next, history: [...s.history, snap(s)].slice(-80), future: [] };
    }),
  selectImage: (selectedImageId) => set({ selectedImageId }),

  dismissWelcome: () => set({ showWelcome: false }),

  pushHistory: () => set((s) => ({ history: [...s.history, snap(s)].slice(-80), future: [] })),
  undo: () =>
    set((s) => {
      if (!s.history.length) return {};
      const prev = s.history[s.history.length - 1];
      return {
        strokes: prev.strokes,
        images: prev.images,
        history: s.history.slice(0, -1),
        future: [snap(s), ...s.future].slice(0, 80),
      };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return {
        strokes: next.strokes,
        images: next.images,
        history: [...s.history, snap(s)].slice(-80),
        future: s.future.slice(1),
      };
    }),
  clearAll: () =>
    set((s) => ({
      strokes: [],
      images: [],
      selectedImageId: null,
      history: [...s.history, snap(s)].slice(-80),
      future: [],
    })),
}));
