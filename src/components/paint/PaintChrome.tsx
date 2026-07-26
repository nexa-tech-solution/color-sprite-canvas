import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  Crosshair,
  Download,
  ImagePlus,
  Minus,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
import { usePaintStore, type ToolId } from "@/stores/paintStore";
import { PALETTE, TOOLS } from "./paintConstants";
import {
  buildImportedBackground,
  exportCanvas,
  fileToDataUrl,
  stopControlEvent,
} from "./paintUtils";

export function TopBar({
  isMobile,
  stickersOpen,
  pagesOpen,
  onToggleStickers,
  onTogglePages,
}: {
  isMobile: boolean;
  stickersOpen: boolean;
  pagesOpen: boolean;
  onToggleStickers: () => void;
  onTogglePages: () => void;
}) {
  const projectName = usePaintStore((state) => state.currentProjectName);
  const setProjectName = usePaintStore((state) => state.setProjectName);
  const undo = usePaintStore((state) => state.undo);
  const redo = usePaintStore((state) => state.redo);
  const clearAll = usePaintStore((state) => state.clearAll);
  const canUndo = usePaintStore((state) => state.history.length > 0);
  const canRedo = usePaintStore((state) => state.future.length > 0);
  const hasContent = usePaintStore(
    (state) => state.strokes.length > 0 || state.images.some((image) => image.kind === "sticker"),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const setBackgroundImage = usePaintStore((state) => state.setBackgroundImage);
  const [draftName, setDraftName] = useState(projectName);

  useEffect(() => {
    setDraftName(projectName);
  }, [projectName]);

  const onImport = () => fileRef.current?.click();
  const commitProjectName = () => {
    setProjectName(draftName.trim() || DEFAULT_PROJECT_NAME);
  };

  const handleFile = async (file: File) => {
    const src = await fileToDataUrl(file);
    const background = await buildImportedBackground(src);
    setBackgroundImage(background, { selectImageId: background.id });
    usePaintStore.getState().setTool("select");
    toast.success("Picture added as your coloring page background");
  };

  return (
    <motion.nav
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="pointer-events-none absolute inset-x-0 top-0 z-40 py-3 sm:py-4"
    >
      <div
        className={`flex ${isMobile ? "px-3" : "flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"}`}
      >
        <div
          className={`pointer-events-auto flex min-w-0 items-center gap-3 border border-slate-100 bg-paint-panel/80 shadow-soft backdrop-blur-md ${
            isMobile
              ? "w-full rounded-full px-3 py-2"
              : "ml-6 max-w-[min(calc(100%-1.5rem),36rem)] rounded-2xl px-0 py-2 sm:px-2"
          }`}
        >
          <Link
            to="/"
            aria-label="Back to projects"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <ChevronLeft className="size-4" />
          </Link>
          {isMobile && (
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-400">
              {projectName}
            </span>
          )}
          {!isMobile && (
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitProjectName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setDraftName(projectName);
                  event.currentTarget.blur();
                }
              }}
              aria-label="Project name"
              className="min-w-0 bg-transparent text-base text-slate-400 outline-none placeholder:text-slate-300"
              placeholder={DEFAULT_PROJECT_NAME}
            />
          )}

          {isMobile && (
            <div className="paint-scrollbar ml-1 flex max-w-[48%] shrink-0 items-center overflow-x-auto rounded-full bg-slate-50/70 p-1">
              <IconBtn
                label="Undo"
                disabled={!canUndo}
                onClick={undo}
                className="size-8 rounded-full"
              >
                <Undo2 className="size-3.5" />
              </IconBtn>
              <IconBtn
                label="Redo"
                disabled={!canRedo}
                onClick={redo}
                className="size-8 rounded-full"
              >
                <Redo2 className="size-3.5" />
              </IconBtn>
              <IconBtn
                label="Clear all"
                disabled={!hasContent}
                onClick={clearAll}
                className="size-8 rounded-full"
              >
                <Trash2 className="size-3.5 text-rose-500" />
              </IconBtn>
              <IconBtn label="Import image" onClick={onImport} className="size-8 rounded-full">
                <ImagePlus className="size-3.5" />
              </IconBtn>
              <button
                onClick={exportCanvas}
                aria-label="Export canvas"
                className="ml-1 flex size-8 items-center justify-center rounded-full border border-violet-200/70 bg-violet-100 text-violet-700 shadow-[0_10px_20px_-14px_rgba(139,92,246,0.75)] transition-colors hover:bg-violet-200/80"
              >
                <Download className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="pointer-events-auto flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="flex min-w-0 items-center rounded-2xl border border-slate-100 bg-paint-panel/80 p-1 shadow-soft backdrop-blur-md">
              <IconBtn label="Undo" disabled={!canUndo} onClick={undo}>
                <Undo2 className="size-4" />
              </IconBtn>
              <IconBtn label="Redo" disabled={!canRedo} onClick={redo}>
                <Redo2 className="size-4" />
              </IconBtn>
              <IconBtn label="Clear all" disabled={!hasContent} onClick={clearAll}>
                <Trash2 className="size-4 text-rose-500" />
              </IconBtn>
            </div>
            <button
              onClick={onImport}
              className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-paint-panel/80 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-soft transition-colors hover:bg-white"
            >
              <ImagePlus className="size-4" /> Import
            </button>
            <button
              onClick={onToggleStickers}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-soft transition-colors ${
                stickersOpen
                  ? "border-amber-200 bg-brand-lemon text-amber-700"
                  : "border-slate-100 bg-paint-panel/80 text-slate-600 hover:bg-white"
              }`}
            >
              <Sparkles className="size-4" /> Stickers
            </button>
            <button
              onClick={onTogglePages}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-soft transition-colors ${
                pagesOpen
                  ? "border-cyan-200 bg-brand-mint text-cyan-700"
                  : "border-slate-100 bg-paint-panel/80 text-slate-600 hover:bg-white"
              }`}
            >
              <BookOpen className="size-4" /> Pages
            </button>
            <button
              onClick={exportCanvas}
              className="flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-100 px-6 py-2.5 text-sm font-medium text-violet-700 shadow-[0_14px_24px_-18px_rgba(139,92,246,0.75)] transition-all hover:bg-violet-200/80"
            >
              <Download className="size-4" /> Export
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = "";
        }}
      />
    </motion.nav>
  );
}

export function ToolDock({
  isMobile,
  stickersOpen,
  pagesOpen,
  onToggleStickers,
  onTogglePages,
  onBrushToolSelected,
}: {
  isMobile: boolean;
  stickersOpen: boolean;
  pagesOpen: boolean;
  onToggleStickers: () => void;
  onTogglePages: () => void;
  onBrushToolSelected?: () => void;
}) {
  const tool = usePaintStore((state) => state.tool);
  const setTool = usePaintStore((state) => state.setTool);
  const fileRef = useRef<HTMLInputElement>(null);
  const setBackgroundImage = usePaintStore((state) => state.setBackgroundImage);
  const brushTools = new Set<ToolId>(["pencil", "brush", "marker", "eraser"]);

  const importImage = async (file: File) => {
    const src = await fileToDataUrl(file);
    const background = await buildImportedBackground(src);
    setBackgroundImage(background, { selectImageId: background.id });
    setTool("select");
    toast.success("Picture added as your coloring page background");
  };

  if (isMobile) {
    return (
      <aside className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-40 flex justify-center px-3 md:hidden">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.05 }}
          className="pointer-events-auto grid w-full grid-cols-8 gap-1 rounded-full border border-slate-100 bg-paint-panel/90 px-2 py-2 shadow-soft backdrop-blur-xl"
        >
          {TOOLS.map((entry) => {
            const active = tool === entry.id;
            return (
              <button
                key={entry.id}
                onClick={() => {
                  setTool(entry.id);
                  if (brushTools.has(entry.id)) {
                    onBrushToolSelected?.();
                  }
                }}
                title={entry.label}
                aria-label={entry.label}
                className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
                  active
                    ? "bg-brand-pink/40 text-pink-600 shadow-inner"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                <entry.icon className="size-[17px]" />
              </button>
            );
          })}
          <button
            onClick={onToggleStickers}
            title="Stickers"
            aria-label="Stickers"
            className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
              stickersOpen
                ? "bg-brand-lemon text-amber-600 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <Sparkles className="size-[17px]" />
          </button>
          <button
            onClick={onTogglePages}
            title="Coloring pages"
            aria-label="Coloring pages"
            className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
              pagesOpen
                ? "bg-brand-mint text-cyan-700 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <BookOpen className="size-[17px]" />
          </button>
        </motion.div>
      </aside>
    );
  }

  return (
    <motion.aside
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.05 }}
      className="absolute left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1.5 rounded-[2rem] border border-slate-100 bg-paint-panel/90 p-2 shadow-soft backdrop-blur-xl md:flex"
    >
      {TOOLS.map((entry) => {
        const active = tool === entry.id;
        return (
          <button
            key={entry.id}
            onClick={() => setTool(entry.id)}
            title={entry.label}
            aria-label={entry.label}
            className={`flex size-11 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              active
                ? "bg-brand-pink/40 text-pink-600 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <entry.icon className="size-5" />
          </button>
        );
      })}
      <div className="mx-auto my-1 h-px w-8 bg-slate-100" />
      <button
        onClick={onToggleStickers}
        title="Stickers"
        aria-label="Stickers"
        className={`flex size-11 items-center justify-center rounded-2xl transition-all active:scale-90 ${
          stickersOpen
            ? "bg-brand-lemon text-amber-600 shadow-inner"
            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        }`}
      >
        <Sparkles className="size-5" />
      </button>
      <button
        onClick={onTogglePages}
        title="Coloring pages"
        aria-label="Coloring pages"
        className={`flex size-11 items-center justify-center rounded-2xl transition-all active:scale-90 ${
          pagesOpen
            ? "bg-brand-mint text-cyan-700 shadow-inner"
            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        }`}
      >
        <BookOpen className="size-5" />
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        title="Import image"
        className="flex size-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      >
        <ImagePlus className="size-5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importImage(file);
          }
          event.target.value = "";
        }}
      />
    </motion.aside>
  );
}

export function BrushDock({
  isMobile,
  isTablet,
  mobileSheetCollapsed,
  onMobileSheetCollapsedChange,
}: {
  isMobile: boolean;
  isTablet: boolean;
  mobileSheetCollapsed: boolean;
  onMobileSheetCollapsedChange: (collapsed: boolean) => void;
}) {
  const tool = usePaintStore((state) => state.tool);
  const showDock = ["pencil", "brush", "marker", "eraser"].includes(tool);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [mobileCollapseOffset, setMobileCollapseOffset] = useState(0);

  useEffect(() => {
    if (!isMobile || !showDock) {
      setMobileCollapseOffset(0);
      return;
    }

    const updateMobileCollapseOffset = () => {
      const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
      setMobileCollapseOffset(Math.max(0, sheetHeight));
    };

    updateMobileCollapseOffset();
    window.addEventListener("resize", updateMobileCollapseOffset);
    return () => window.removeEventListener("resize", updateMobileCollapseOffset);
  }, [isMobile, showDock, tool]);

  const handleMobileSheetDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (!isMobile) return;

    const shouldCollapse =
      info.offset.y > Math.max(72, mobileCollapseOffset * 0.24) || info.velocity.y > 500;
    const shouldExpand = info.offset.y < -36 || info.velocity.y < -300;

    if (shouldCollapse) {
      onMobileSheetCollapsedChange(true);
      return;
    }

    if (shouldExpand) {
      onMobileSheetCollapsedChange(false);
      return;
    }

    onMobileSheetCollapsedChange(mobileSheetCollapsed);
  };

  return (
    <AnimatePresence>
      {showDock && (
        <>
          {isMobile && mobileSheetCollapsed && (
            <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] z-50 flex justify-center">
              <button
                type="button"
                aria-label="Expand brush controls"
                aria-expanded={false}
                onClick={() => onMobileSheetCollapsedChange(false)}
                onPointerDown={(event) => dragControls.start(event)}
                className="block cursor-grab rounded-full p-3 active:cursor-grabbing touch-none"
              >
                <span className="block h-1.5 w-14 rounded-full bg-slate-300/90 shadow-soft" />
              </button>
            </div>
          )}
          <motion.footer
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: isMobile && mobileSheetCollapsed ? mobileCollapseOffset : 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: isMobile ? mobileCollapseOffset : 0 }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={handleMobileSheetDragEnd}
            className={`absolute z-40 ${
              isMobile
                ? "inset-x-0 bottom-0 overflow-hidden"
                : isTablet
                  ? "left-1/2 w-[min(calc(100vw-3rem),58rem)] max-w-[calc(100vw-3rem)] -translate-x-1/2 bottom-5"
                  : "left-1/2 max-w-[calc(100vw-24px)] -translate-x-1/2 bottom-6"
            }`}
          >
            <div
              ref={sheetRef}
              className={`transform-gpu border border-slate-100 bg-paint-panel/90 shadow-soft backdrop-blur-xl [backface-visibility:hidden] [will-change:transform] ${
                isMobile
                  ? "rounded-t-[2.25rem] border-b-0 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4"
                  : isTablet
                    ? "flex items-center gap-2 rounded-full px-3 py-2.5"
                    : "flex items-center gap-3 rounded-full px-4 py-3 sm:gap-5 sm:px-6"
              }`}
            >
              {isMobile && !mobileSheetCollapsed && (
                <div className="mx-auto mb-3 flex w-24 justify-center pt-1 touch-none">
                  <button
                    type="button"
                    aria-label="Collapse brush controls"
                    aria-expanded
                    onClick={() => onMobileSheetCollapsedChange(true)}
                    onPointerDown={(event) => dragControls.start(event)}
                    className="block cursor-grab rounded-full p-2 active:cursor-grabbing touch-none"
                  >
                    <span className="block h-1.5 w-14 rounded-full bg-slate-300/80" />
                  </button>
                </div>
              )}
              <BrushDockContent tool={tool} isTablet={isTablet} isMobile={isMobile} />
            </div>
          </motion.footer>
        </>
      )}
    </AnimatePresence>
  );
}

export function ZoomNav({
  isMobile,
  isTablet,
  mobileSheetCollapsed,
}: {
  isMobile: boolean;
  isTablet: boolean;
  mobileSheetCollapsed: boolean;
}) {
  const scale = usePaintStore((state) => state.transform.scale);
  const zoomAt = usePaintStore((state) => state.zoomAt);
  const resetView = usePaintStore((state) => state.resetView);
  const tool = usePaintStore((state) => state.tool);
  const brushDockVisible = ["pencil", "brush", "marker", "eraser"].includes(tool);
  const mobileSheetVisible = isMobile && brushDockVisible;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.1 }}
      className={`absolute z-40 flex items-center border border-slate-100 bg-paint-panel/90 shadow-soft backdrop-blur-md ${
        mobileSheetVisible
          ? `${mobileSheetCollapsed ? "bottom-[2.85rem]" : "bottom-[12.9rem]"} left-1/2 -translate-x-1/2 gap-1 rounded-[1.7rem] p-1.5`
          : isMobile
            ? "bottom-5 left-1/2 -translate-x-1/2 gap-1 rounded-2xl p-1.5"
            : isTablet
              ? `${brushDockVisible ? "bottom-[5.7rem]" : "bottom-5"} left-1/2 -translate-x-1/2 gap-1 rounded-2xl p-1.5`
              : "bottom-6 right-4 gap-1 rounded-2xl p-1.5"
      }`}
    >
      <button
        onClick={() => zoomAt(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2)}
        className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
        aria-label="Zoom out"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-11 text-center text-xs font-bold text-slate-500">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={() => zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2)}
        className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
        aria-label="Zoom in"
      >
        <Plus className="size-4" />
      </button>
      <div className="h-4 w-px bg-slate-200" />
      <button
        onClick={resetView}
        className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
        aria-label="Reset view"
      >
        <Crosshair className="size-4" />
      </button>
    </motion.div>
  );
}

export function WelcomeCard({ isMobile }: { isMobile: boolean }) {
  const show = usePaintStore((state) => state.showWelcome);
  const dismiss = usePaintStore((state) => state.dismissWelcome);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className={`pointer-events-auto rounded-[2rem] border border-slate-100 bg-paint-panel/95 text-center shadow-float backdrop-blur-xl ${
              isMobile ? "w-[calc(100vw-24px)] max-w-md p-6" : "max-w-sm p-8"
            }`}
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-lilac">
              <Sparkles className="size-7 text-white" />
            </div>
            <h1
              className={`mb-2 font-semibold text-slate-800 ${
                isMobile ? "text-xl leading-tight" : "text-2xl"
              }`}
            >
              Pick a page and start coloring
            </h1>
            <p
              className={`mb-6 text-slate-500 ${isMobile ? "text-xs leading-relaxed" : "text-sm"}`}
            >
              We already loaded a coloring page for you. Pan stays inside the picture, and you can
              import a photo to turn it into your own sheet.
            </p>
            <button
              onClick={dismiss}
              className={`w-full rounded-2xl bg-slate-900 py-3 font-medium text-white transition-colors hover:bg-slate-800 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
            >
              Start Coloring
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BrushDockContent({
  tool,
  isTablet,
  isMobile,
}: {
  tool: ToolId;
  isTablet: boolean;
  isMobile: boolean;
}) {
  const color = usePaintStore((state) => state.color);
  const setColor = usePaintStore((state) => state.setColor);
  const brushSize = usePaintStore((state) => state.brushSize);
  const setBrushSize = usePaintStore((state) => state.setBrushSize);
  const opacity = usePaintStore((state) => state.opacity);
  const setOpacity = usePaintStore((state) => state.setOpacity);

  if (isMobile) {
    return (
      <div className="flex w-full flex-col gap-5">
        <div className="grid grid-cols-[5.75rem_1px_minmax(0,1fr)] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-inner"
              style={{
                backgroundColor: tool === "eraser" ? "#fff" : color,
                border: tool === "eraser" ? "2px dashed #cbd5e1" : "none",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.max(4, brushSize * 0.6),
                  height: Math.max(4, brushSize * 0.6),
                  backgroundColor: "rgba(255,255,255,0.6)",
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="text-[15px] font-bold capitalize text-slate-700">{tool}</div>
              <div className="text-[11px] tabular-nums text-slate-400">
                {brushSize}pt · {Math.round(opacity * 100)}%
              </div>
            </div>
          </div>

          <div className="h-16 bg-slate-200" />

          <div className="grid min-w-0 grid-cols-2 gap-4">
            <div className="space-y-2">
              <input
                type="range"
                min={1}
                max={80}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                onPointerDown={stopControlEvent}
                onPointerMove={stopControlEvent}
                onPointerUp={stopControlEvent}
                onPointerCancel={stopControlEvent}
                onWheel={stopControlEvent}
                className="w-full cursor-pointer accent-pink-400"
                aria-label="Brush size"
              />
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Size</span>
                <span className="tabular-nums text-slate-500">{brushSize}pt</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                onPointerDown={stopControlEvent}
                onPointerMove={stopControlEvent}
                onPointerUp={stopControlEvent}
                onPointerCancel={stopControlEvent}
                onWheel={stopControlEvent}
                className="w-full cursor-pointer accent-pink-300"
                aria-label="Opacity"
              />
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Opacity</span>
                <span className="tabular-nums text-slate-500">{Math.round(opacity * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="paint-scrollbar -mx-1 flex gap-3 overflow-x-auto overflow-y-hidden px-1 pb-1">
          {PALETTE.map((entry) => (
            <button
              key={entry}
              onClick={() => setColor(entry)}
              aria-label={`Color ${entry}`}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-transform hover:scale-105 ${
                color === entry ? "border-pink-400" : "border-transparent"
              }`}
            >
              <span
                className="block size-8 rounded-full"
                style={{
                  backgroundColor: entry,
                  border: entry === "#ffffff" ? "1px solid #e2e8f0" : "none",
                }}
              />
            </button>
          ))}
          <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100">
            <Plus className="size-3" />
            <input
              type="color"
              className="sr-only"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex shrink-0 items-center gap-3 ${isTablet ? "w-[10.25rem]" : "w-[12rem]"}`}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full shadow-inner"
          style={{
            backgroundColor: tool === "eraser" ? "#fff" : color,
            border: tool === "eraser" ? "2px dashed #cbd5e1" : "none",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: Math.max(4, brushSize * 0.6),
              height: Math.max(4, brushSize * 0.6),
              backgroundColor: "rgba(255,255,255,0.6)",
            }}
          />
        </div>
        <div className={`min-w-0 flex-col ${isTablet ? "flex" : "hidden sm:flex"}`}>
          <span className="text-sm font-bold capitalize">{tool}</span>
          <span className="text-[10px] tabular-nums text-slate-400">
            {brushSize}pt · {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>

      <div className={`h-8 w-px shrink-0 bg-slate-200 ${isTablet ? "block" : "hidden sm:block"}`} />

      <div
        className={`shrink-0 items-center gap-3 ${
          isTablet ? "flex w-[11.25rem]" : "hidden w-[13.25rem] sm:flex"
        }`}
      >
        <input
          type="range"
          min={1}
          max={80}
          value={brushSize}
          onChange={(event) => setBrushSize(Number(event.target.value))}
          onPointerDown={stopControlEvent}
          onPointerMove={stopControlEvent}
          onPointerUp={stopControlEvent}
          onPointerCancel={stopControlEvent}
          onWheel={stopControlEvent}
          className={`shrink-0 cursor-pointer accent-pink-400 ${isTablet ? "w-20" : "w-24"}`}
          aria-label="Brush size"
        />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
          onPointerDown={stopControlEvent}
          onPointerMove={stopControlEvent}
          onPointerUp={stopControlEvent}
          onPointerCancel={stopControlEvent}
          onWheel={stopControlEvent}
          className={`shrink-0 cursor-pointer accent-pink-300 ${isTablet ? "w-16" : "w-20"}`}
          aria-label="Opacity"
        />
      </div>

      <div className="h-8 w-px shrink-0 bg-slate-200" />

      <div
        className={`paint-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden px-2 py-1 ${
          isTablet ? "max-w-[22rem]" : "max-w-[236px] sm:max-w-none"
        }`}
      >
        {PALETTE.map((entry) => (
          <button
            key={entry}
            onClick={() => setColor(entry)}
            aria-label={`Color ${entry}`}
            className={`flex shrink-0 items-center justify-center rounded-full border-2 bg-white transition-transform hover:scale-110 ${
              isTablet ? "size-8" : "size-9"
            } ${color === entry ? "border-pink-400" : "border-transparent"}`}
          >
            <span
              className={`block rounded-full ${isTablet ? "size-[1.625rem]" : "size-7"}`}
              style={{
                backgroundColor: entry,
                border: entry === "#ffffff" ? "1px solid #e2e8f0" : "none",
              }}
            />
          </button>
        ))}
        <label
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 ${
            isTablet ? "size-8" : "size-9"
          }`}
        >
          <Plus className="size-3" />
          <input
            type="color"
            className="sr-only"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
      </div>
    </>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
