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

export interface PaintProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  transform: Transform;
  strokes: Stroke[];
  images: CanvasImage[];
}

export const DEFAULT_PROJECT_NAME = "Untitled sketch";
export const PROJECTS_CHANGED_EVENT = "pastel-paint:projects-changed";

const STORAGE_KEY = "pastel-paint.projects.v1";
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

function readProjects() {
  if (!canUseStorage()) return [] as PaintProject[];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortProjects(
      parsed.filter(
        (project): project is PaintProject =>
          typeof project?.id === "string" &&
          typeof project?.name === "string" &&
          typeof project?.createdAt === "string" &&
          typeof project?.updatedAt === "string" &&
          project?.transform &&
          Array.isArray(project?.strokes) &&
          Array.isArray(project?.images),
      ),
    );
  } catch {
    return [];
  }
}

function writeProjects(projects: PaintProject[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortProjects(projects)));
  window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
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
  const normalized: PaintProject = {
    ...project,
    name: normalizeProjectName(project.name),
    updatedAt: project.updatedAt || new Date().toISOString(),
  };

  const projects = readProjects();
  const index = projects.findIndex((entry) => entry.id === normalized.id);

  if (index >= 0) {
    projects[index] = normalized;
  } else {
    projects.push(normalized);
  }

  writeProjects(projects);
  return normalized;
}

export function createProject(overrides: Partial<PaintProject> = {}) {
  return saveProject(makeBlankProject(overrides));
}

export function deleteProject(projectId: string) {
  const nextProjects = readProjects().filter((project) => project.id !== projectId);
  writeProjects(nextProjects);
}
