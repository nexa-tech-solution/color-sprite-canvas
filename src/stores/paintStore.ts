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

const TOOL_STORAGE_KEY = "paint.selected-tool";

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
  preferBlankCanvas: boolean;

  showWelcome: boolean;
  /** Fit the page to the screen as soon as the viewport is known. */
  pendingFit: boolean;

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
  clearBackground: () => void;

  beginStroke: (s: Stroke) => void;
  extendStroke: (id: string, p: Point) => void;
  endStroke: () => void;
  /** Drop a stroke that turned out to be the first finger of a pinch. */
  cancelStroke: (id: string) => void;

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

function isRestorableTool(tool: string): tool is Exclude<ToolId, "image"> {
  return ["select", "pan", "pencil", "brush", "marker", "eraser"].includes(tool);
}

// Kids expect a finger to paint straight away; two fingers already pan/zoom.
const DEFAULT_TOOL: Exclude<ToolId, "image"> = "brush";

function getInitialTool(): Exclude<ToolId, "image"> {
  if (typeof window === "undefined") return DEFAULT_TOOL;

  try {
    const storedTool = window.localStorage.getItem(TOOL_STORAGE_KEY);
    return storedTool && isRestorableTool(storedTool) ? storedTool : DEFAULT_TOOL;
  } catch {
    return DEFAULT_TOOL;
  }
}

function persistTool(tool: ToolId) {
  if (typeof window === "undefined" || tool === "image") return;
  try {
    window.localStorage.setItem(TOOL_STORAGE_KEY, tool);
  } catch {
    // Storage full or blocked — the tool choice is a convenience only.
  }
}

/** Device safe-area insets (notch / home indicator), read once from CSS env(). */
let safeAreaCache: { top: number; bottom: number } | null = null;
function getSafeAreaInsets() {
  if (safeAreaCache) return safeAreaCache;
  if (typeof document === "undefined" || !document.body) return { top: 0, bottom: 0 };

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  safeAreaCache = {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
  };
  probe.remove();
  return safeAreaCache;
}

function getViewportFrame(viewport: Viewport): ViewportFrame {
  const isMobile = viewport.width < 768;
  const safeArea = getSafeAreaInsets();
  const leftInset = isMobile ? 16 : 32;
  const rightInset = isMobile ? 16 : 32;
  const topInset = (isMobile ? 196 : 118) + safeArea.top;
  const bottomInset = (isMobile ? 170 : 132) + safeArea.bottom;

  return {
    left: leftInset,
    top: topInset,
    width: Math.max(1, viewport.width - leftInset - rightInset),
    height: Math.max(1, viewport.height - topInset - bottomInset),
  };
}

function getViewportFocusYOffset(viewport: Viewport, image: CanvasImage | null) {
  if (viewport.width >= 768 || !image) return 0;

  return image.kind === "coloring-page" ? -40 : -24;
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
  const scale = Math.max(getMinScale(image, viewport), transform.scale);
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

  // Zoomed in, the page may be dragged a bit past its top/bottom edge so kids can draw near the
  // edge without their finger sitting under the toolbars or the bottom panel.
  const ySlack = Math.min(160, frame.height * 0.3);
  const y =
    scaledHeight <= frame.height
      ? frame.top +
        frame.height / 2 -
        (image.y + image.height / 2) * scale +
        getViewportFocusYOffset(viewport, image)
      : clamp(
          transform.y,
          frame.top + frame.height - (image.y + image.height) * scale - ySlack,
          frame.top - image.y * scale + ySlack,
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
      y:
        frame.top +
        frame.height / 2 -
        (image.y + image.height / 2) * scale +
        getViewportFocusYOffset(viewport, image),
    },
    viewport,
    image,
  );
}

// Strokes and images are replaced immutably (only the in-progress stroke's
// points grow in place, and it is never part of an earlier snapshot), so
// history can share references instead of deep-copying every point 80 times.
function snap(state: PaintState): Snapshot {
  return { strokes: state.strokes, images: state.images };
}

export function projectFromState(state: PaintState): PaintProject | null {
  if (!state.currentProjectId || !state.currentProjectCreatedAt) return null;

  return {
    id: state.currentProjectId,
    name: state.currentProjectName.trim() || DEFAULT_PROJECT_NAME,
    preferBlankCanvas: state.preferBlankCanvas,
    createdAt: state.currentProjectCreatedAt,
    updatedAt: new Date().toISOString(),
    transform: { ...state.transform },
    strokes: state.strokes.map((stroke) => ({ ...stroke, points: stroke.points.slice() })),
    images: state.images.map((image) => ({ ...image, rotation: image.rotation ?? 0 })),
  };
}

export const usePaintStore = create<PaintState>((set, get) => ({
  currentProjectId: null,
  currentProjectName: DEFAULT_PROJECT_NAME,
  currentProjectCreatedAt: null,
  currentProjectUpdatedAt: null,
  isProjectLoaded: false,

  tool: getInitialTool(),
  color: "#f472b6",
  brushSize: 14,
  opacity: 1,
  recentColors: ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#1f2937"],

  transform: initialTransform,
  viewport: initialViewport,

  strokes: [],
  images: [],
  selectedImageId: null,
  preferBlankCanvas: false,

  showWelcome: true,
  pendingFit: false,

  history: [],
  future: [],

  loadProject: (project) =>
    set(() => {
      const hasBackgroundImage = project.images.some((image) => image.kind !== "sticker");
      const resolvedPreferBlankCanvas = project.preferBlankCanvas ?? !hasBackgroundImage;
      const isEmptyProject = project.strokes.length === 0 && project.images.length === 0;
      const background = getBackgroundImage(project.images);
      const viewport = get().viewport;
      // A project created with its page already attached (e.g. photo → coloring
      // page) has never been framed; fit it instead of showing it at 100%.
      const untouched =
        project.transform.x === 0 && project.transform.y === 0 && project.transform.scale === 1;
      const needsFit = Boolean(background) && untouched;
      const hasViewport = viewport.width > 0 && viewport.height > 0;

      return {
        currentProjectId: project.id,
        currentProjectName: project.name,
        currentProjectCreatedAt: project.createdAt,
        currentProjectUpdatedAt: project.updatedAt,
        isProjectLoaded: true,
        transform:
          needsFit && background && hasViewport
            ? getFocusedTransform(background, viewport)
            : clampTransform({ ...project.transform }, viewport, background),
        pendingFit: needsFit && !hasViewport,
        strokes: project.strokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        })),
        images: project.images.map((image) => ({ ...image, rotation: image.rotation ?? 0 })),
        selectedImageId: null,
        preferBlankCanvas: resolvedPreferBlankCanvas,
        showWelcome: resolvedPreferBlankCanvas ? false : isEmptyProject,
        history: [],
        future: [],
      };
    }),
  setProjectName: (name) => set({ currentProjectName: name.trim() || DEFAULT_PROJECT_NAME }),
  setTool: (tool) => {
    persistTool(tool);
    set({ tool, selectedImageId: tool === "select" ? get().selectedImageId : null });
  },
  setColor: (color) =>
    set((s) => ({
      color,
      recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 8),
    })),
  setBrushSize: (brushSize) => set({ brushSize }),
  setOpacity: (opacity) => set({ opacity }),
  setViewport: (viewport) =>
    set((s) => {
      const background = getBackgroundImage(s.images);
      if (s.pendingFit && background && viewport.width > 0 && viewport.height > 0) {
        return {
          viewport,
          pendingFit: false,
          transform: getFocusedTransform(background, viewport),
        };
      }
      return { viewport, transform: clampTransform(s.transform, viewport, background) };
    }),

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
      const nextScale = Math.max(getMinScale(background, s.viewport), s.transform.scale * factor);
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
      const backgroundImage = { ...image, kind: image.kind ?? "image", rotation: 0 };
      const images = [
        backgroundImage,
        ...s.images.filter((existingImage) => existingImage.kind === "sticker"),
      ];
      const nextState = {
        images,
        selectedImageId: options?.selectImageId ?? null,
        preferBlankCanvas: false,
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
  clearBackground: () =>
    set((s) => {
      const images = s.images.filter((image) => image.kind === "sticker");
      return {
        images,
        selectedImageId: null,
        preferBlankCanvas: true,
        showWelcome: false,
        transform: initialTransform,
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
    set((st) => {
      const index = st.strokes.length - 1;
      const active = st.strokes[index];
      if (!active || active.id !== id) return {};
      // Append in place (O(1)) instead of copying the whole point list per move.
      active.points.push(p);
      const strokes = st.strokes.slice();
      strokes[index] = { ...active };
      return { strokes };
    }),
  endStroke: () => {},
  cancelStroke: (id) =>
    set((st) => {
      const last = st.strokes[st.strokes.length - 1];
      if (!last || last.id !== id) return {};
      const previous = st.history[st.history.length - 1];
      return {
        strokes: st.strokes.slice(0, -1),
        history:
          previous && previous.strokes.length === st.strokes.length - 1
            ? st.history.slice(0, -1)
            : st.history,
      };
    }),

  addImage: (img) =>
    set((s) => {
      const next = {
        ...s,
        images: [...s.images, { ...img, rotation: img.rotation ?? 0 }],
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
      const preferBlankCanvas = !getBackgroundImage(images);
      const next = {
        images,
        selectedImageId: null,
        preferBlankCanvas,
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
