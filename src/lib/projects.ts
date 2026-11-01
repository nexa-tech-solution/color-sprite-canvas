import {
  dbDelete,
  dbGetAll,
  dbPutMany,
  isIndexedDbAvailable,
  requestPersistentStorage,
} from "./projectDb";

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
  src: string;
  originalSrc: string;
  kind?: "image" | "sticker" | "coloring-page";
  isOutline: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface PaintProject {
  id: string;
  name: string;
  isFavorite?: boolean;
  progress?: number;
  preferBlankCanvas?: boolean;
  createdAt: string;
  updatedAt: string;
  transform: Transform;
  strokes: Stroke[];
  images: CanvasImage[];
}

export const DEFAULT_PROJECT_NAME = "My coloring page";
export const PROJECTS_CHANGED_EVENT = "pastel-paint:projects-changed";
export const STORAGE_ERROR_EVENT = "pastel-paint:storage-error";

const STORAGE_KEY = "pastel-paint.projects.v1";
const MIGRATED_KEY = "pastel-paint.migrated-to-idb.v1";
const initialTransform: Transform = { x: 0, y: 0, scale: 1 };

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sortProjects(projects: PaintProject[]) {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function normalizeProjectName(name?: string | null) {
  return name?.trim() || DEFAULT_PROJECT_NAME;
}

function isValidProject(project: unknown): project is PaintProject {
  const candidate = project as PaintProject | null;
  return (
    typeof candidate?.id === "string" &&
    typeof candidate?.name === "string" &&
    typeof candidate?.createdAt === "string" &&
    typeof candidate?.updatedAt === "string" &&
    Boolean(candidate?.transform) &&
    Array.isArray(candidate?.strokes) &&
    Array.isArray(candidate?.images)
  );
}

function readLocalStorageProjects(): PaintProject[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidProject) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* In-memory cache backed by IndexedDB (localStorage as fallback).      */
/* The public API stays synchronous; persistence happens in background. */
/* ------------------------------------------------------------------ */

let cache: PaintProject[] | null = null;
let useIndexedDb = false;
let initPromise: Promise<void> | null = null;
const pendingWrites = new Map<string, PaintProject | null>();
let flushChain: Promise<void> = Promise.resolve();
let flushScheduled = false;

function reportStorageError(error: unknown) {
  console.error("[projects] failed to save", error);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: error }));
  }
}

function writeLocalStorageSnapshot() {
  if (!canUseStorage() || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    reportStorageError(error);
  }
}

async function flushWrites() {
  flushScheduled = false;
  if (pendingWrites.size === 0) return;

  const entries = [...pendingWrites.entries()];
  pendingWrites.clear();

  if (!useIndexedDb) {
    writeLocalStorageSnapshot();
    return;
  }

  try {
    const puts = entries.filter(([, project]) => project).map(([, project]) => project!);
    const deletes = entries.filter(([, project]) => !project).map(([id]) => id);
    if (puts.length) await dbPutMany(puts);
    for (const id of deletes) await dbDelete(id);
  } catch (error) {
    reportStorageError(error);
  }
}

function schedulePersist(id: string, project: PaintProject | null) {
  pendingWrites.set(id, project);
  if (flushScheduled) return;
  flushScheduled = true;
  flushChain = flushChain
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    .then(flushWrites);
}

/** Wait until every queued write has reached storage (used before the app is backgrounded). */
export function flushProjectWrites(): Promise<void> {
  if (pendingWrites.size > 0 && !flushScheduled) {
    flushScheduled = true;
    flushChain = flushChain.then(flushWrites);
  }
  return flushChain;
}

/**
 * Load projects into memory. Must resolve before list/get calls return real data.
 * Migrates the legacy localStorage blob into IndexedDB the first time it runs.
 */
export function initProjectStore(): Promise<void> {
  if (initPromise) return initPromise;
  if (typeof window === "undefined") return Promise.resolve();

  initPromise = (async () => {
    if (!isIndexedDbAvailable()) {
      cache = readLocalStorageProjects();
      return;
    }

    try {
      const stored = (await dbGetAll<PaintProject>()).filter(isValidProject);
      const legacy =
        canUseStorage() && !window.localStorage.getItem(MIGRATED_KEY)
          ? readLocalStorageProjects()
          : [];

      if (legacy.length) {
        const known = new Set(stored.map((project) => project.id));
        const toMigrate = legacy.filter((project) => !known.has(project.id));
        if (toMigrate.length) await dbPutMany(toMigrate);
        stored.push(...toMigrate);
      }

      if (canUseStorage()) {
        try {
          window.localStorage.setItem(MIGRATED_KEY, "1");
          // Free the ~5MB localStorage quota now that IndexedDB holds the data.
          if (legacy.length) window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore — migration flag is an optimisation only.
        }
      }

      useIndexedDb = true;
      cache = stored;
      requestPersistentStorage();
    } catch (error) {
      console.warn("[projects] IndexedDB unavailable, using localStorage", error);
      useIndexedDb = false;
      cache = readLocalStorageProjects();
    }
  })();

  return initPromise;
}

function readProjects() {
  return sortProjects(cache ?? []);
}

function commit(projects: PaintProject[], changed: { id: string; project: PaintProject | null }[]) {
  cache = projects;
  for (const entry of changed) schedulePersist(entry.id, entry.project);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
  }
}

function makeProjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `project-${Date.now()}`;
}

export function makeBlankProject(overrides: Partial<PaintProject> = {}): PaintProject {
  const now = new Date().toISOString();

  return {
    id: overrides.id ?? makeProjectId(),
    name: normalizeProjectName(overrides.name),
    isFavorite: overrides.isFavorite ?? false,
    progress: overrides.progress ?? 0,
    preferBlankCanvas: overrides.preferBlankCanvas ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    transform: overrides.transform ?? { ...initialTransform },
    strokes: overrides.strokes ?? [],
    images: overrides.images ?? [],
  };
}

export function listProjects() {
  return readProjects();
}

export function getProject(projectId: string) {
  return readProjects().find((project) => project.id === projectId) ?? null;
}

export function saveProject(project: PaintProject) {
  const projects = readProjects();
  const index = projects.findIndex((entry) => entry.id === project.id);
  const existing = index >= 0 ? projects[index] : null;
  const normalized: PaintProject = {
    ...project,
    isFavorite: project.isFavorite ?? existing?.isFavorite ?? false,
    progress: project.progress ?? existing?.progress ?? 0,
    preferBlankCanvas: project.preferBlankCanvas ?? existing?.preferBlankCanvas ?? false,
    name: normalizeProjectName(project.name),
    updatedAt: project.updatedAt || new Date().toISOString(),
  };

  if (index >= 0) {
    projects[index] = normalized;
  } else {
    projects.push(normalized);
  }

  commit(projects, [{ id: normalized.id, project: normalized }]);
  return normalized;
}

export function createProject(overrides: Partial<PaintProject> = {}) {
  return saveProject(makeBlankProject(overrides));
}

export function deleteProject(projectId: string) {
  const nextProjects = readProjects().filter((project) => project.id !== projectId);
  commit(nextProjects, [{ id: projectId, project: null }]);
}

export function toggleProjectFavorite(projectId: string) {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === projectId);

  if (index < 0) return false;

  const isFavorite = !projects[index].isFavorite;
  projects[index] = { ...projects[index], isFavorite };
  commit(projects, [{ id: projectId, project: projects[index] }]);

  return isFavorite;
}

export function updateProjectProgress(
  projectId: string,
  progress: number,
  expectedUpdatedAt?: string,
) {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === projectId);

  if (index < 0) return null;
  if (expectedUpdatedAt && projects[index].updatedAt !== expectedUpdatedAt) return null;

  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  if (projects[index].progress === normalizedProgress) return projects[index];
  projects[index] = { ...projects[index], progress: normalizedProgress };
  commit(projects, [{ id: projectId, project: projects[index] }]);

  return projects[index];
}
