import { create } from "zustand";
import {
  DEFAULT_PROJECT_NAME,
  type CanvasImage,
  type PaintProject,
  type Point,
  type Stroke,
  type Transform,
} from "@/lib/projects";

export type ToolId = "select" | "pan" | "pencil" | "brush" | "marker" | "eraser" | "image";
export type { CanvasImage, PaintProject, Point, Stroke, Transform };

interface Snapshot {
  strokes: Stroke[];
  images: CanvasImage[];
}

interface Viewport {
  width: number;
  height: number;
}

interface ViewportFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PaintState {
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectCreatedAt: string | null;
  currentProjectUpdatedAt: string | null;
  isProjectLoaded: boolean;

  tool: ToolId;
  color: string;
  brushSize: number;
  opacity: number;
  recentColors: string[];

  transform: Transform;
  viewport: Viewport;

  strokes: Stroke[];
  images: CanvasImage[];
  selectedImageId: string | null;

  showWelcome: boolean;

  history: Snapshot[];
  future: Snapshot[];

  loadProject: (project: PaintProject) => void;
  setProjectName: (name: string) => void;
  setTool: (t: ToolId) => void;
  setColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setOpacity: (n: number) => void;
  setViewport: (viewport: Viewport) => void;
  setTransform: (t: Transform) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, cx: number, cy: number) => void;
  resetView: () => void;
  setBackgroundImage: (
    image: CanvasImage,
    options?: { keepWelcome?: boolean; selectImageId?: string | null; skipHistory?: boolean },
  ) => void;

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
const initialViewport: Viewport = { width: 0, height: 0 };

function getViewportFrame(viewport: Viewport): ViewportFrame {
  const isMobile = viewport.width < 768;
  const leftInset = isMobile ? 16 : 32;
  const rightInset = isMobile ? 16 : 32;
  const topInset = isMobile ? 196 : 118;
  const bottomInset = isMobile ? 170 : 132;

  return {
    left: leftInset,
    top: topInset,
    width: Math.max(1, viewport.width - leftInset - rightInset),
    height: Math.max(1, viewport.height - topInset - bottomInset),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBackgroundImage(images: CanvasImage[]) {
  return images.find((image) => image.kind !== "sticker") ?? null;
}

function getMinScale(image: CanvasImage | null, viewport: Viewport) {
  if (!image || viewport.width <= 0 || viewport.height <= 0) return 0.1;

  const frame = getViewportFrame(viewport);
  const contentPadding = viewport.width < 640 ? 12 : 20;
  const availableWidth = Math.max(1, frame.width - contentPadding * 2);
  const availableHeight = Math.max(1, frame.height - contentPadding * 2);

  return clamp(Math.min(availableWidth / image.width, availableHeight / image.height), 0.1, 3);
}

function clampTransform(transform: Transform, viewport: Viewport, image: CanvasImage | null) {
  if (!image || viewport.width <= 0 || viewport.height <= 0) return transform;

  const frame = getViewportFrame(viewport);
  const scale = clamp(transform.scale, getMinScale(image, viewport), 8);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  const x =
    scaledWidth <= frame.width
      ? frame.left + frame.width / 2 - (image.x + image.width / 2) * scale
      : clamp(
          transform.x,
          frame.left + frame.width - (image.x + image.width) * scale,
          frame.left - image.x * scale,
        );

  const y =
    scaledHeight <= frame.height
      ? frame.top + frame.height / 2 - (image.y + image.height / 2) * scale
      : clamp(
          transform.y,
          frame.top + frame.height - (image.y + image.height) * scale,
          frame.top - image.y * scale,
        );

  return { scale, x, y };
}

function getFocusedTransform(image: CanvasImage, viewport: Viewport) {
  if (viewport.width <= 0 || viewport.height <= 0) return initialTransform;

  const frame = getViewportFrame(viewport);
  const scale = getMinScale(image, viewport);
  return clampTransform(
    {
      scale,
      x: frame.left + frame.width / 2 - (image.x + image.width / 2) * scale,
      y: frame.top + frame.height / 2 - (image.y + image.height / 2) * scale,
    },
    viewport,
    image,
  );
}

function snap(state: PaintState): Snapshot {
  return {
    strokes: state.strokes.map((s) => ({ ...s, points: [...s.points] })),
    images: state.images.map((i) => ({ ...i })),
  };
}

export function projectFromState(state: PaintState): PaintProject | null {
  if (!state.currentProjectId || !state.currentProjectCreatedAt) return null;

  return {
    id: state.currentProjectId,
    name: state.currentProjectName.trim() || DEFAULT_PROJECT_NAME,
    createdAt: state.currentProjectCreatedAt,
    updatedAt: new Date().toISOString(),
    transform: { ...state.transform },
    strokes: state.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
    images: state.images.map((image) => ({ ...image })),
  };
}

export const usePaintStore = create<PaintState>((set, get) => ({
  currentProjectId: null,
  currentProjectName: DEFAULT_PROJECT_NAME,
  currentProjectCreatedAt: null,
  currentProjectUpdatedAt: null,
  isProjectLoaded: false,

  tool: "brush",
  color: "#f472b6",
  brushSize: 14,
  opacity: 1,
  recentColors: ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#1f2937"],

  transform: initialTransform,
  viewport: initialViewport,

  strokes: [],
  images: [],
  selectedImageId: null,

  showWelcome: true,

  history: [],
  future: [],

  loadProject: (project) =>
    set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      currentProjectCreatedAt: project.createdAt,
      currentProjectUpdatedAt: project.updatedAt,
      isProjectLoaded: true,
      transform: clampTransform(
        { ...project.transform },
        get().viewport,
        getBackgroundImage(project.images),
      ),
      strokes: project.strokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({ ...point })),
      })),
      images: project.images.map((image) => ({ ...image })),
      selectedImageId: null,
      showWelcome: project.strokes.length === 0 && project.images.length === 0,
      history: [],
      future: [],
    }),
  setProjectName: (name) => set({ currentProjectName: name.trim() || DEFAULT_PROJECT_NAME }),
  setTool: (tool) =>
    set({ tool, selectedImageId: tool === "select" ? get().selectedImageId : null }),
  setColor: (color) =>
    set((s) => ({
      color,
      recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 8),
    })),
  setBrushSize: (brushSize) => set({ brushSize }),
  setOpacity: (opacity) => set({ opacity }),
  setViewport: (viewport) =>
    set((s) => ({
      viewport,
      transform: clampTransform(s.transform, viewport, getBackgroundImage(s.images)),
    })),

  setTransform: (transform) =>
    set((s) => ({
      transform: clampTransform(transform, s.viewport, getBackgroundImage(s.images)),
    })),
  panBy: (dx, dy) =>
    set((s) => ({
      transform: clampTransform(
        { ...s.transform, x: s.transform.x + dx, y: s.transform.y + dy },
        s.viewport,
        getBackgroundImage(s.images),
      ),
    })),
  zoomAt: (factor, cx, cy) =>
    set((s) => {
      const background = getBackgroundImage(s.images);
      const nextScale = clamp(s.transform.scale * factor, getMinScale(background, s.viewport), 8);
      const k = nextScale / s.transform.scale;
      return {
        transform: clampTransform(
          {
            scale: nextScale,
            x: cx - (cx - s.transform.x) * k,
            y: cy - (cy - s.transform.y) * k,
          },
          s.viewport,
          background,
        ),
      };
    }),
  resetView: () =>
    set((s) => {
      const background = getBackgroundImage(s.images);
      return {
        transform: background ? getFocusedTransform(background, s.viewport) : initialTransform,
      };
    }),
  setBackgroundImage: (image, options) =>
    set((s) => {
      const backgroundImage = { ...image, kind: image.kind ?? "image" };
      const images = [
        backgroundImage,
        ...s.images.filter((existingImage) => existingImage.kind === "sticker"),
      ];
      const nextState = {
        images,
        selectedImageId: options?.selectImageId ?? null,
        showWelcome: options?.keepWelcome ? s.showWelcome : false,
        transform: getFocusedTransform(backgroundImage, s.viewport),
      };

      if (options?.skipHistory) return nextState;

      return {
        ...nextState,
        history: [...s.history, snap(s)].slice(-80),
        future: [],
      };
    }),

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
    set((s) => {
      const images = s.images.map((image) => (image.id === id ? { ...image, ...patch } : image));
      return {
        images,
        transform: clampTransform(s.transform, s.viewport, getBackgroundImage(images)),
      };
    }),
  removeImage: (id) =>
    set((s) => {
      const images = s.images.filter((image) => image.id !== id);
      const next = {
        images,
        selectedImageId: null,
        transform: clampTransform(s.transform, s.viewport, getBackgroundImage(images)),
      };
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
        transform: clampTransform(s.transform, s.viewport, getBackgroundImage(prev.images)),
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
        transform: clampTransform(s.transform, s.viewport, getBackgroundImage(next.images)),
        history: [...s.history, snap(s)].slice(-80),
        future: s.future.slice(1),
      };
    }),
  clearAll: () =>
    set((s) => ({
      strokes: [],
      images: s.images.filter((image) => image.kind !== "sticker"),
      selectedImageId: null,
      history: [...s.history, snap(s)].slice(-80),
      future: [],
    })),
}));
