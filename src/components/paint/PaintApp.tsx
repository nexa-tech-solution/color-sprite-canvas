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
} from "lucide-react";
import { usePaintStore, type ToolId } from "@/stores/paintStore";
import { CanvasSurface } from "./CanvasSurface";
import { imageToColoringPage } from "@/lib/coloringPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
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

export function PaintApp() {
  const isMobile = useIsMobile();

  return (
    <div className="fixed inset-0 bg-paint-canvas overflow-hidden text-slate-700">
      <CanvasSurface />
      <WelcomeCard isMobile={isMobile} />
      <TopBar isMobile={isMobile} />
      <ToolDock isMobile={isMobile} />
      <BrushDock isMobile={isMobile} />
      <PropertiesPanel isMobile={isMobile} />
      <ZoomNav isMobile={isMobile} />
    </div>
  );
}

function TopBar({ isMobile }: { isMobile: boolean }) {
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
        className={`flex ${isMobile ? "items-center justify-between gap-2" : "flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"}`}
      >
        <div
          className={`pointer-events-auto flex min-w-0 items-center gap-3 border border-slate-100 bg-paint-panel/80 shadow-soft backdrop-blur-md ${
            isMobile
              ? "max-w-[15rem] rounded-full px-3 py-2"
              : "max-w-[min(100%,36rem)] rounded-2xl px-3 py-2 sm:px-4"
          }`}
        >
          <Link
            to="/"
            aria-label="Back to projects"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-pink text-xl font-bold text-pink-500">
            P
          </div>
          <span
            className={`shrink-0 truncate font-semibold tracking-tight ${isMobile ? "max-w-[5.25rem] text-base" : ""}`}
          >
            PastelPaint
          </span>
          <div className="h-4 w-px shrink-0 bg-slate-200" />
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
            className={`min-w-0 bg-transparent text-slate-400 outline-none placeholder:text-slate-300 ${
              isMobile ? "w-24 text-sm" : "w-52 text-base"
            }`}
            placeholder={DEFAULT_PROJECT_NAME}
          />
        </div>

        <div
          className={`pointer-events-auto flex ${isMobile ? "shrink-0" : "w-full items-center justify-between gap-2 sm:w-auto sm:justify-end"}`}
        >
          {isMobile ? (
            <div className="flex items-center rounded-full border border-slate-100 bg-paint-panel/85 p-1 shadow-soft backdrop-blur-md">
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
              <button
                onClick={onExport}
                aria-label="Export canvas"
                className="ml-1 flex size-9 items-center justify-center rounded-full bg-brand-lilac/50 text-purple-700 transition-colors hover:bg-brand-lilac/70"
              >
                <Download className="size-4" />
              </button>
            </div>
          ) : (
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
                onClick={onExport}
                className="flex items-center gap-2 rounded-2xl border border-brand-lilac/30 bg-brand-lilac/40 px-6 py-2.5 text-sm font-medium text-purple-700 shadow-soft transition-all hover:bg-brand-lilac/60"
              >
                <Download className="size-4" /> Export
              </button>
            </>
          )}
        </div>
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

function ToolDock({ isMobile }: { isMobile: boolean }) {
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
      <aside className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-40 flex justify-center px-3 md:hidden">
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

function BrushDock({ isMobile }: { isMobile: boolean }) {
  const tool = usePaintStore((s) => s.tool);
  const color = usePaintStore((s) => s.color);
  const setColor = usePaintStore((s) => s.setColor);
  const brushSize = usePaintStore((s) => s.brushSize);
  const setBrushSize = usePaintStore((s) => s.setBrushSize);
  const opacity = usePaintStore((s) => s.opacity);
  const setOpacity = usePaintStore((s) => s.setOpacity);

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
          <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 bg-paint-panel/90 backdrop-blur-xl rounded-full shadow-soft border border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-full flex items-center justify-center shadow-inner"
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
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold capitalize">{tool}</span>
                <span className="text-[10px] text-slate-400">
                  {brushSize}pt · {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={80}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-pink-400 cursor-pointer"
                aria-label="Brush size"
              />
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-20 accent-pink-300 cursor-pointer"
                aria-label="Opacity"
              />
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="paint-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden px-2 py-1 max-w-[236px] sm:max-w-none">
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
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
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
              ? "left-3 right-3 top-[10.5rem] max-h-[calc(100vh-13rem)] overflow-y-auto paint-scrollbar"
              : "right-4 top-24 w-72 max-w-[calc(100vw-32px)] md:top-1/2 md:-translate-y-1/2"
          }`}
        >
          <div className="p-5 bg-paint-panel/95 backdrop-blur-xl rounded-[2rem] shadow-soft border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="size-3" /> Magic Tools
            </h3>
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

            <div className="space-y-4">
              <Slider
                label="Line Strength"
                value={strength}
                onChange={setStrength}
                min={0.2}
                max={1}
              />
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

          <div className="p-3 bg-paint-panel/95 backdrop-blur-xl rounded-[2rem] shadow-soft border border-slate-100 flex gap-2">
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

  const bgs = images.filter((i) => !i.isOutline);
  const outs = images.filter((i) => i.isOutline);
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
