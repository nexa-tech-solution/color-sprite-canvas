import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  MousePointer2,
  Hand,
  Pencil,
  Paintbrush,
  Highlighter,
  Eraser,
  ImagePlus,
  Undo2,
  Redo2,
  Download,
  Plus,
  Minus,
  Sparkles,
  Trash2,
  Copy,
  RotateCcw,
  Crosshair,
  BookOpen,
} from "lucide-react";
import { usePaintStore, type ToolId } from "@/stores/paintStore";
import { CanvasSurface } from "./CanvasSurface";
import { imageToColoringPage } from "@/lib/coloringPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
import { COLORING_PAGES, coloringPageToSrc, type ColoringPage } from "@/lib/coloringPages";
import { STICKERS, type Sticker, stickerToDataUrl } from "@/lib/stickers";
import { toast } from "sonner";

const TOOLS: { id: ToolId; label: string; icon: React.ElementType }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan (Space)", icon: Hand },
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "brush", label: "Brush", icon: Paintbrush },
  { id: "marker", label: "Marker", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

const PALETTE = [
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

function stopControlEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function PaintApp() {
  const isMobile = useIsMobile();
  const [stickersOpen, setStickersOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);

  const toggleStickers = () => {
    setPagesOpen(false);
    setStickersOpen((open) => !open);
  };

  const togglePages = () => {
    setStickersOpen(false);
    setPagesOpen((open) => !open);
  };

  return (
    <div className="fixed inset-0 bg-paint-canvas overflow-hidden text-slate-700">
      <CanvasSurface />
      <WelcomeCard isMobile={isMobile} />
      <TopBar
        isMobile={isMobile}
        stickersOpen={stickersOpen}
        pagesOpen={pagesOpen}
        onToggleStickers={toggleStickers}
        onTogglePages={togglePages}
      />
      <ToolDock
        isMobile={isMobile}
        stickersOpen={stickersOpen}
        pagesOpen={pagesOpen}
        onToggleStickers={toggleStickers}
        onTogglePages={togglePages}
      />
      <ColoringPageShelf isMobile={isMobile} open={pagesOpen} onClose={() => setPagesOpen(false)} />
      <StickerShelf
        isMobile={isMobile}
        open={stickersOpen}
        onClose={() => setStickersOpen(false)}
      />
      <BrushDock isMobile={isMobile} />
      <PropertiesPanel isMobile={isMobile} />
      <ZoomNav isMobile={isMobile} />
    </div>
  );
}

function TopBar({
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
  const projectName = usePaintStore((s) => s.currentProjectName);
  const setProjectName = usePaintStore((s) => s.setProjectName);
  const undo = usePaintStore((s) => s.undo);
  const redo = usePaintStore((s) => s.redo);
  const clearAll = usePaintStore((s) => s.clearAll);
  const canUndo = usePaintStore((s) => s.history.length > 0);
  const canRedo = usePaintStore((s) => s.future.length > 0);
  const hasContent = usePaintStore((s) => s.strokes.length > 0 || s.images.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const addImage = usePaintStore((s) => s.addImage);
  const transform = usePaintStore((s) => s.transform);
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
    const img = await loadImg(src);
    const maxW = 600;
    const scale = Math.min(1, maxW / img.width);
    const w = img.width * scale;
    const h = img.height * scale;
    // center in current viewport
    const cx = (window.innerWidth / 2 - transform.x) / transform.scale;
    const cy = (window.innerHeight / 2 - transform.y) / transform.scale;
    addImage({
      id: crypto.randomUUID(),
      src,
      originalSrc: src,
      kind: "image",
      isOutline: false,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      opacity: 1,
    });
    usePaintStore.getState().setTool("select");
    toast.success("Image added — tap Make Coloring Page in the panel");
  };

  const onExport = () => {
    exportCanvas();
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
            <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-400">
              {projectName}
            </span>
          )}
          {/* <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-pink text-xl font-bold text-pink-500">
            P
          </div>
          <span
            className={`shrink-0 truncate font-semibold tracking-tight ${isMobile ? "max-w-[7rem] text-base" : ""}`}
          >
            PastelPaint
          </span> */}
          {/* <div className="h-4 w-px shrink-0 bg-slate-200" /> */}
          {!isMobile && (
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitProjectName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setDraftName(projectName);
                  e.currentTarget.blur();
                }
              }}
              aria-label="Project name"
              className="min-w-0 bg-transparent text-base text-slate-400 outline-none placeholder:text-slate-300"
              placeholder={DEFAULT_PROJECT_NAME}
            />
          )}

          {isMobile && (
            <div className="paint-scrollbar ml-1 flex max-w-[58%] shrink-0 items-center overflow-x-auto rounded-full bg-slate-50/70 p-1">
              <IconBtn
                label="Undo"
                disabled={!canUndo}
                onClick={undo}
                className="size-9 rounded-full"
              >
                <Undo2 className="size-4" />
              </IconBtn>
              <IconBtn
                label="Redo"
                disabled={!canRedo}
                onClick={redo}
                className="size-9 rounded-full"
              >
                <Redo2 className="size-4" />
              </IconBtn>
              <IconBtn
                label="Clear all"
                disabled={!hasContent}
                onClick={clearAll}
                className="size-9 rounded-full"
              >
                <Trash2 className="size-4 text-rose-500" />
              </IconBtn>
              <IconBtn label="Import image" onClick={onImport} className="size-9 rounded-full">
                <ImagePlus className="size-4" />
              </IconBtn>
              <IconBtn
                label="Coloring pages"
                onClick={onTogglePages}
                className={`size-9 rounded-full ${pagesOpen ? "bg-brand-mint text-cyan-700" : ""}`}
              >
                <BookOpen className="size-4" />
              </IconBtn>
              <IconBtn
                label="Stickers"
                onClick={onToggleStickers}
                className={`size-9 rounded-full ${
                  stickersOpen ? "bg-brand-lemon text-amber-600" : ""
                }`}
              >
                <Sparkles className="size-4" />
              </IconBtn>
              <button
                onClick={onExport}
                aria-label="Export canvas"
                className="ml-1 flex size-9 items-center justify-center rounded-full bg-brand-lilac/50 text-purple-700 transition-colors hover:bg-brand-lilac/70"
              >
                <Download className="size-4" />
              </button>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="pointer-events-auto flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <>
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
                onClick={onExport}
                className="flex items-center gap-2 rounded-2xl border border-brand-lilac/30 bg-brand-lilac/40 px-6 py-2.5 text-sm font-medium text-purple-700 shadow-soft transition-all hover:bg-brand-lilac/60"
              >
                <Download className="size-4" /> Export
              </button>
            </>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </motion.nav>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  className,
}: {
  children: React.ReactNode;
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

function ToolDock({
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
  const tool = usePaintStore((s) => s.tool);
  const setTool = usePaintStore((s) => s.setTool);
  const fileRef = useRef<HTMLInputElement>(null);
  const addImage = usePaintStore((s) => s.addImage);
  const transform = usePaintStore((s) => s.transform);

  const importImage = async (file: File) => {
    const src = await fileToDataUrl(file);
    const img = await loadImg(src);
    const maxW = 600;
    const scale = Math.min(1, maxW / img.width);
    const w = img.width * scale;
    const h = img.height * scale;
    const cx = (window.innerWidth / 2 - transform.x) / transform.scale;
    const cy = (window.innerHeight / 2 - transform.y) / transform.scale;
    addImage({
      id: crypto.randomUUID(),
      src,
      originalSrc: src,
      kind: "image",
      isOutline: false,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      opacity: 1,
    });
    setTool("select");
  };

  if (isMobile) {
    return (
      <aside className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-40 flex justify-center px-3 md:hidden">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.05 }}
          className="paint-scrollbar pointer-events-auto flex w-fit max-w-full items-center justify-center gap-2 overflow-x-auto rounded-full border border-slate-100 bg-paint-panel/90 px-3 py-2 shadow-soft backdrop-blur-xl"
        >
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                aria-label={t.label}
                className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
                  active
                    ? "bg-brand-pink/40 text-pink-600 shadow-inner"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                <t.icon className="size-[18px]" />
              </button>
            );
          })}
          <button
            onClick={onToggleStickers}
            title="Stickers"
            aria-label="Stickers"
            className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
              stickersOpen
                ? "bg-brand-lemon text-amber-600 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <Sparkles className="size-[18px]" />
          </button>
          <button
            onClick={onTogglePages}
            title="Coloring pages"
            aria-label="Coloring pages"
            className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
              pagesOpen
                ? "bg-brand-mint text-cyan-700 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <BookOpen className="size-[18px]" />
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
      {TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            aria-label={t.label}
            className={`flex size-11 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              active
                ? "bg-brand-pink/40 text-pink-600 shadow-inner"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <t.icon className="size-5" />
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importImage(f);
          e.target.value = "";
        }}
      />
    </motion.aside>
  );
}

function StickerShelf({
  isMobile,
  open,
  onClose,
}: {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const addImage = usePaintStore((s) => s.addImage);
  const setTool = usePaintStore((s) => s.setTool);
  const transform = usePaintStore((s) => s.transform);
  const categories: Sticker["category"][] = ["Cute", "Nature", "Play"];

  const addSticker = (sticker: Sticker) => {
    const src = stickerToDataUrl(sticker);
    const maxStickerWidth = isMobile ? 132 : 156;
    const scale = Math.min(1, maxStickerWidth / sticker.width);
    const width = Math.round(sticker.width * scale);
    const height = Math.round(sticker.height * scale);
    const centerX = (window.innerWidth / 2 - transform.x) / transform.scale;
    const centerY = (window.innerHeight / 2 - transform.y) / transform.scale;

    addImage({
      id: crypto.randomUUID(),
      src,
      originalSrc: src,
      kind: "sticker",
      isOutline: false,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      opacity: 1,
    });
    setTool("select");
    toast.success(`${sticker.name} sticker added`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={isMobile ? { y: 40, opacity: 0 } : { x: -24, opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { y: 40, opacity: 0 } : { x: -24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onWheel={stopControlEvent}
          onTouchMove={stopControlEvent}
          className={`pointer-events-auto absolute z-50 ${
            isMobile
              ? "inset-x-3 bottom-20 h-[48dvh]"
              : "bottom-6 left-[4.75rem] top-24 hidden w-[19rem] md:block"
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-paint-panel/95 shadow-float backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 p-4 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                  Sticker book
                </p>
                <h2 className="text-lg font-semibold text-slate-800">Pick a sticker</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="paint-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 [touch-action:pan-y]">
              {categories.map((category) => (
                <section key={category}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {category}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {STICKERS.filter((sticker) => sticker.category === category).map((sticker) => (
                      <button
                        key={sticker.id}
                        type="button"
                        onClick={() => addSticker(sticker)}
                        title={sticker.name}
                        aria-label={`Add ${sticker.name} sticker`}
                        className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_8px_18px_-15px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95"
                      >
                        <img
                          src={stickerToDataUrl(sticker)}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ColoringPageShelf({
  isMobile,
  open,
  onClose,
}: {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const addImage = usePaintStore((s) => s.addImage);
  const setTool = usePaintStore((s) => s.setTool);
  const transform = usePaintStore((s) => s.transform);
  const categories = Array.from(new Set(COLORING_PAGES.map((page) => page.category)));

  const addColoringPage = async (page: ColoringPage) => {
    const src = coloringPageToSrc(page);
    const img = await loadImg(src);
    const pageWidth = page.width ?? img.width;
    const pageHeight = page.height ?? img.height;
    const maxPageWidth = isMobile ? Math.min(window.innerWidth - 56, 330) : 520;
    const scale = Math.min(1, maxPageWidth / pageWidth);
    const width = Math.round(pageWidth * scale);
    const height = Math.round(pageHeight * scale);
    const centerX = (window.innerWidth / 2 - transform.x) / transform.scale;
    const centerY = (window.innerHeight / 2 - transform.y) / transform.scale;

    addImage({
      id: crypto.randomUUID(),
      src,
      originalSrc: src,
      kind: "coloring-page",
      isOutline: true,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      opacity: 1,
    });
    setTool("brush");
    onClose();
    toast.success(`${page.name} added — pick a color and paint`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={isMobile ? { y: 40, opacity: 0 } : { x: -24, opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { y: 40, opacity: 0 } : { x: -24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onWheel={stopControlEvent}
          onTouchMove={stopControlEvent}
          className={`pointer-events-auto absolute z-50 ${
            isMobile
              ? "inset-x-3 bottom-20 h-[58dvh]"
              : "bottom-6 left-[4.75rem] top-24 hidden w-[22rem] md:block"
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-cyan-100/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,253,255,0.92))] shadow-float backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 p-4 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600">
                  Coloring book
                </p>
                <h2 className="text-lg font-semibold text-slate-800">Pick a page</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="paint-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 [touch-action:pan-y]">
              {categories.map((category) => (
                <section key={category}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {COLORING_PAGES.filter((page) => page.category === category).map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => addColoringPage(page)}
                        title={page.name}
                        aria-label={`Add ${page.name} coloring page`}
                        className="group cursor-pointer overflow-hidden rounded-[1.35rem] border border-cyan-100/80 bg-white p-2 text-left shadow-[0_12px_24px_-18px_rgba(15,23,42,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_30px_-22px_rgba(8,145,178,0.75)] active:scale-95"
                      >
                        <span className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,_#ffffff_0%,_#f8fdff_58%,_#eefcff_100%)] px-3 py-2">
                          <img
                            src={coloringPageToSrc(page)}
                            alt=""
                            className="h-full w-full object-contain opacity-95 transition-transform duration-200 group-hover:scale-[1.03]"
                            draggable={false}
                          />
                        </span>
                        <span className="mt-2 block truncate px-1 text-xs font-semibold text-slate-700">
                          {page.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function BrushDock({ isMobile }: { isMobile: boolean }) {
  const tool = usePaintStore((s) => s.tool);
  const showDock = ["pencil", "brush", "marker", "eraser"].includes(tool);

  return (
    <AnimatePresence>
      {showDock && (
        <motion.footer
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className={`absolute left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 ${
            isMobile ? "bottom-5" : "bottom-6"
          }`}
        >
          <div className="flex transform-gpu items-center gap-3 rounded-full border border-slate-100 bg-paint-panel/90 px-4 py-3 shadow-soft backdrop-blur-xl [backface-visibility:hidden] [will-change:transform] sm:gap-5 sm:px-6">
            <BrushDockContent tool={tool} />
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}

function BrushDockContent({ tool }: { tool: ToolId }) {
  const color = usePaintStore((s) => s.color);
  const setColor = usePaintStore((s) => s.setColor);
  const brushSize = usePaintStore((s) => s.brushSize);
  const setBrushSize = usePaintStore((s) => s.setBrushSize);
  const opacity = usePaintStore((s) => s.opacity);
  const setOpacity = usePaintStore((s) => s.setOpacity);

  return (
    <>
      <div className="flex w-[12rem] shrink-0 items-center gap-3">
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
        <div className="hidden min-w-[5.75rem] flex-col sm:flex">
          <span className="text-sm font-bold capitalize">{tool}</span>
          <span className="text-[10px] tabular-nums text-slate-400">
            {brushSize}pt · {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>

      <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />

      <div className="hidden w-[13.25rem] shrink-0 items-center gap-3 sm:flex">
        <input
          type="range"
          min={1}
          max={80}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          onPointerDown={stopControlEvent}
          onPointerMove={stopControlEvent}
          onPointerUp={stopControlEvent}
          onPointerCancel={stopControlEvent}
          onWheel={stopControlEvent}
          className="w-24 shrink-0 accent-pink-400 cursor-pointer"
          aria-label="Brush size"
        />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          onPointerDown={stopControlEvent}
          onPointerMove={stopControlEvent}
          onPointerUp={stopControlEvent}
          onPointerCancel={stopControlEvent}
          onWheel={stopControlEvent}
          className="w-20 shrink-0 accent-pink-300 cursor-pointer"
          aria-label="Opacity"
        />
      </div>

      <div className="h-8 w-px shrink-0 bg-slate-200" />

      <div className="paint-scrollbar flex max-w-[236px] gap-1 overflow-x-auto overflow-y-hidden px-2 py-1 sm:max-w-none">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-transform hover:scale-110 ${
              color === c ? "border-pink-400" : "border-transparent"
            }`}
          >
            <span
              className="block size-7 rounded-full"
              style={{
                backgroundColor: c,
                border: c === "#ffffff" ? "1px solid #e2e8f0" : "none",
              }}
            />
          </button>
        ))}
        <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100">
          <Plus className="size-3" />
          <input
            type="color"
            className="sr-only"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
      </div>
    </>
  );
}

function PropertiesPanel({ isMobile }: { isMobile: boolean }) {
  const selectedId = usePaintStore((s) => s.selectedImageId);
  const image = usePaintStore((s) => s.images.find((i) => i.id === selectedId));
  const updateImage = usePaintStore((s) => s.updateImage);
  const removeImage = usePaintStore((s) => s.removeImage);
  const addImage = usePaintStore((s) => s.addImage);
  const pushHistory = usePaintStore((s) => s.pushHistory);
  const [strength, setStrength] = useState(0.75);
  const [processing, setProcessing] = useState(false);
  const isSticker = image?.kind === "sticker";
  const isColoringPage = image?.kind === "coloring-page";

  const makeColoringPage = async () => {
    if (!image) return;
    setProcessing(true);
    try {
      const outlineSrc = await imageToColoringPage(image.originalSrc, { lineStrength: strength });
      pushHistory();
      updateImage(image.id, { src: outlineSrc, isOutline: true });
      toast.success("Coloring page ready — paint away!");
    } catch (e) {
      toast.error("Couldn't process this image. Try another one.");
    } finally {
      setProcessing(false);
    }
  };

  const restore = () => {
    if (!image) return;
    pushHistory();
    updateImage(image.id, { src: image.originalSrc, isOutline: false });
  };

  const duplicate = () => {
    if (!image) return;
    addImage({ ...image, id: crypto.randomUUID(), x: image.x + 30, y: image.y + 30 });
  };

  return (
    <AnimatePresence>
      {image && (
        <motion.aside
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className={`absolute z-40 flex flex-col gap-4 ${
            isMobile
              ? "paint-scrollbar inset-x-3 bottom-24 max-h-[44vh] overflow-y-auto"
              : "right-4 top-24 w-72 max-w-[calc(100vw-32px)] md:top-1/2 md:-translate-y-1/2"
          }`}
        >
          <div
            className={`border border-slate-100 bg-paint-panel/95 shadow-soft backdrop-blur-xl ${
              isMobile ? "rounded-[1.5rem] p-4" : "rounded-[2rem] p-5"
            }`}
          >
            <h3
              className={`flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400 ${
                isMobile ? "mb-3 text-[11px]" : "mb-4 text-xs"
              }`}
            >
              <Sparkles className="size-3" />{" "}
              {isSticker ? "Sticker Tools" : isColoringPage ? "Coloring Page" : "Magic Tools"}
            </h3>
            {!isSticker && !isColoringPage && (
              <>
                <button
                  onClick={makeColoringPage}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white py-3 rounded-2xl font-semibold shadow-float mb-3 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-60"
                >
                  {processing
                    ? "Working magic…"
                    : image.isOutline
                      ? "Re-generate outline"
                      : "Make Coloring Page"}
                </button>
                {image.isOutline && (
                  <button
                    onClick={restore}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 rounded-xl mb-3"
                  >
                    <RotateCcw className="size-4" /> Restore original
                  </button>
                )}
              </>
            )}

            {isSticker && (
              <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium leading-relaxed text-amber-700 sm:text-sm">
                Move it with Select, duplicate it, or soften it with opacity.
              </div>
            )}

            {isColoringPage && (
              <div className="mb-4 rounded-2xl bg-cyan-50 px-4 py-3 text-xs font-medium leading-relaxed text-cyan-800 sm:text-sm">
                Color with Brush, Pencil, or Marker. The black lines stay above your colors.
              </div>
            )}

            <div className="space-y-4">
              {!isSticker && !isColoringPage && (
                <Slider
                  label="Line Strength"
                  value={strength}
                  onChange={setStrength}
                  min={0.2}
                  max={1}
                />
              )}
              <Slider
                label="Opacity"
                value={image.opacity}
                onChange={(v) => updateImage(image.id, { opacity: v })}
                onChangeStart={pushHistory}
                min={0.1}
                max={1}
              />
            </div>
          </div>

          <div
            className={`flex gap-2 border border-slate-100 bg-paint-panel/95 shadow-soft backdrop-blur-xl ${
              isMobile ? "rounded-[1.5rem] p-2" : "rounded-[2rem] p-3"
            }`}
          >
            <button
              onClick={duplicate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-2xl"
            >
              <Copy className="size-4" /> Duplicate
            </button>
            <button
              onClick={() => removeImage(image.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-rose-500 hover:bg-rose-50 rounded-2xl"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Slider({
  label,
  value,
  onChange,
  onChangeStart,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onChangeStart?: () => void;
  min: number;
  max: number;
}) {
  const changingRef = useRef(false);

  const finishChange = () => {
    changingRef.current = false;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span>{label}</span>
        <span className="text-slate-400">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => {
          if (!changingRef.current) {
            onChangeStart?.();
            changingRef.current = true;
          }
          onChange(Number(e.target.value));
        }}
        onPointerDown={finishChange}
        onPointerUp={finishChange}
        onPointerCancel={finishChange}
        onBlur={finishChange}
        className="w-full accent-pink-400 cursor-pointer"
      />
    </div>
  );
}

function ZoomNav({ isMobile }: { isMobile: boolean }) {
  const scale = usePaintStore((s) => s.transform.scale);
  const zoomAt = usePaintStore((s) => s.zoomAt);
  const resetView = usePaintStore((s) => s.resetView);
  const tool = usePaintStore((s) => s.tool);
  const brushDockVisible = ["pencil", "brush", "marker", "eraser"].includes(tool);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.1 }}
      className={`absolute z-40 flex items-center gap-1 rounded-2xl border border-slate-100 bg-paint-panel/90 p-1.5 shadow-soft backdrop-blur-md ${
        isMobile
          ? `${brushDockVisible ? "bottom-24" : "bottom-5"} left-1/2 -translate-x-1/2`
          : "bottom-6 right-4"
      }`}
    >
      <button
        onClick={() => zoomAt(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2)}
        className="size-8 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500"
        aria-label="Zoom out"
      >
        <Minus className="size-4" />
      </button>
      <span className="text-xs font-bold text-slate-500 w-11 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={() => zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2)}
        className="size-8 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500"
        aria-label="Zoom in"
      >
        <Plus className="size-4" />
      </button>
      <div className="w-px h-4 bg-slate-200" />
      <button
        onClick={resetView}
        className="size-8 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-400"
        aria-label="Reset view"
      >
        <Crosshair className="size-4" />
      </button>
    </motion.div>
  );
}

function WelcomeCard({ isMobile }: { isMobile: boolean }) {
  const show = usePaintStore((s) => s.showWelcome);
  const dismiss = usePaintStore((s) => s.dismissWelcome);
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
            <div className="size-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-lilac flex items-center justify-center">
              <Sparkles className="size-7 text-white" />
            </div>
            <h1
              className={`mb-2 font-semibold text-slate-800 ${
                isMobile ? "text-xl leading-tight" : "text-2xl"
              }`}
            >
              Start creating something cute
            </h1>
            <p
              className={`mb-6 text-slate-500 ${isMobile ? "text-xs leading-relaxed" : "text-sm"}`}
            >
              Draw with one finger. Two fingers to pan, pinch to zoom. Or import a photo to turn it
              into a coloring page.
            </p>
            <button
              onClick={dismiss}
              className={`w-full rounded-2xl bg-slate-900 py-3 font-medium text-white transition-colors hover:bg-slate-800 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
            >
              Start Drawing
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// helpers
async function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

async function exportCanvas() {
  const st = usePaintStore.getState();
  const { strokes, images } = st;
  if (!strokes.length && !images.length) {
    toast.error("Nothing to export yet — draw something first!");
    return;
  }
  // compute bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const im of images) {
    minX = Math.min(minX, im.x);
    minY = Math.min(minY, im.y);
    maxX = Math.max(maxX, im.x + im.width);
    maxY = Math.max(maxY, im.y + im.height);
  }
  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x - s.size);
      minY = Math.min(minY, p.y - s.size);
      maxX = Math.max(maxX, p.x + s.size);
      maxY = Math.max(maxY, p.y + s.size);
    }
  }
  const pad = 40;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const c = document.createElement("canvas");
  c.width = Math.min(4096, Math.round(w));
  c.height = Math.min(4096, Math.round(h));
  const scaleFactor = c.width / w;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(-minX * scaleFactor, -minY * scaleFactor);
  ctx.scale(scaleFactor, scaleFactor);

  const bgs = images.filter((i) => !i.isOutline && i.kind !== "sticker");
  const outs = images.filter((i) => i.isOutline && i.kind !== "sticker");
  const stickers = images.filter((i) => i.kind === "sticker");
  await Promise.all(images.map((im) => waitLoad(im.src)));

  for (const im of bgs) {
    const img = await waitLoad(im.src);
    ctx.globalAlpha = im.opacity;
    ctx.drawImage(img, im.x, im.y, im.width, im.height);
  }
  ctx.globalAlpha = 1;
  for (const s of strokes) {
    ctx.globalAlpha = s.opacity;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.size;
    if (s.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
    } else {
      ctx.globalCompositeOperation = s.tool === "marker" ? "multiply" : "source-over";
      ctx.strokeStyle = s.color;
    }
    ctx.beginPath();
    if (s.points.length) ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length - 1; i++) {
      const mx = (s.points[i].x + s.points[i + 1].x) / 2;
      const my = (s.points[i].y + s.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(s.points[i].x, s.points[i].y, mx, my);
    }
    if (s.points.length > 1) ctx.lineTo(s.points.at(-1)!.x, s.points.at(-1)!.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  for (const im of outs) {
    const img = await waitLoad(im.src);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(img, im.x, im.y, im.width, im.height);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  for (const im of stickers) {
    const img = await waitLoad(im.src);
    ctx.globalAlpha = im.opacity;
    ctx.drawImage(img, im.x, im.y, im.width, im.height);
  }

  const url = c.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `pastelpaint-${Date.now()}.png`;
  a.click();
  toast.success("Exported!");
}

function waitLoad(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
