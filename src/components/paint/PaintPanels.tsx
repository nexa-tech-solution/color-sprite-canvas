import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Drum,
  Heart,
  IceCreamBowl,
  Leaf,
  Package,
  PawPrint,
  Search,
  Smile,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { imageToColoringPage } from "@/lib/coloringPage";
import { COLORING_PAGES, coloringPageToSrc, type ColoringPage } from "@/lib/coloringPages";
import {
  getStickerDimensions,
  STICKERS,
  STICKER_SUBJECTS,
  type Sticker,
  type StickerSubject,
  stickerToSrc,
} from "@/lib/stickers";
import { usePaintStore } from "@/stores/paintStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildColoringBookBackground, stopControlEvent } from "./paintUtils";

export function StickerShelf({
  isMobile,
  open,
  onClose,
}: {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const addImage = usePaintStore((state) => state.addImage);
  const setTool = usePaintStore((state) => state.setTool);
  const transform = usePaintStore((state) => state.transform);
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<StickerSubject | null>(null);
  const [activeSubject, setActiveSubject] = useState<StickerSubject>("Happy");
  const subjectRefs = useRef<Partial<Record<StickerSubject, HTMLElement>>>({});
  const normalizedQuery = query.trim().toLowerCase();
  const filteredStickers = normalizedQuery
    ? STICKERS.filter((sticker) =>
        `${sticker.name} ${sticker.subject}`.toLowerCase().includes(normalizedQuery),
      )
    : STICKERS;
  const visibleSubjects = selectedSubject ? [selectedSubject] : STICKER_SUBJECTS;
  const subjectIcons = {
    Happy: Smile,
    Love: Heart,
    Animals: PawPrint,
    "Food & Drink": IceCreamBowl,
    Nature: Leaf,
    Activities: Drum,
    Things: Package,
  } satisfies Record<StickerSubject, typeof Smile>;

  const showSubject = (subject: StickerSubject) => {
    setActiveSubject(subject);
    subjectRefs.current[subject]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addSticker = async (sticker: Sticker) => {
    const src = stickerToSrc(sticker);
    const dimensions = await getStickerDimensions(sticker);
    const maxStickerSize = isMobile ? 132 : 156;
    const scale = Math.min(1, maxStickerSize / Math.max(dimensions.width, dimensions.height));
    const width = Math.round(dimensions.width * scale);
    const height = Math.round(dimensions.height * scale);
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
      rotation: 0,
      opacity: 1,
    });
    setTool("select");
    if (isMobile) {
      onClose();
    }
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
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
                  Sticker book
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-800">
                  Pick a sticker
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sticker picker"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="shrink-0 px-4 pb-3">
              <label htmlFor="sticker-search" className="sr-only">
                Search stickers
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition-colors focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="size-4 shrink-0" aria-hidden="true" />
                <input
                  id="sticker-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    selectedSubject
                      ? `Search ${selectedSubject.toLowerCase()} stickers`
                      : "Search stickers"
                  }
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear sticker search"
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {selectedSubject ? (
              <div className="flex shrink-0 items-center gap-3 border-y border-slate-100 bg-blue-50/40 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedSubject(null);
                  }}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-slate-500 shadow-none transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-label="Back to all sticker subjects"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700">{selectedSubject}</p>
                </div>
              </div>
            ) : (
              !normalizedQuery && (
                <div className="paint-scrollbar flex shrink-0 snap-x snap-mandatory gap-1 overflow-x-auto border-y border-slate-100 px-2 [touch-action:pan-x]">
                  {STICKER_SUBJECTS.map((subject) => {
                    const Icon = subjectIcons[subject];
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => showSubject(subject)}
                        title={subject}
                        aria-label={`Jump to ${subject} stickers`}
                        className={`relative flex size-12 shrink-0 snap-start cursor-pointer items-center justify-center text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600 after:transition-transform ${
                          activeSubject === subject
                            ? "text-blue-600 after:scale-x-100"
                            : "after:scale-x-0"
                        }`}
                      >
                        <Icon className="size-5 stroke-[1.8]" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              )
            )}

            <div className="paint-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 [touch-action:pan-y]">
              {visibleSubjects.map((subject) => {
                const stickers = filteredStickers.filter((sticker) => sticker.subject === subject);
                if (!stickers.length) return null;

                return (
                  <section
                    key={subject}
                    ref={(element) => {
                      subjectRefs.current[subject] = element ?? undefined;
                    }}
                    className="scroll-mt-2 border-b border-slate-100 pb-2 last:border-b-0"
                  >
                    <div
                      className={
                        selectedSubject ? "" : "mb-1 flex items-center justify-between gap-3"
                      }
                    >
                      {!selectedSubject && (
                        <h3 className="text-sm font-bold text-slate-700">{subject}</h3>
                      )}
                      {!selectedSubject && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubject(subject)}
                          className="cursor-pointer text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          See all
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                      {stickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          onClick={() => addSticker(sticker)}
                          title={sticker.name}
                          aria-label={`Add ${sticker.name} sticker`}
                          className="flex aspect-square cursor-pointer items-center justify-center p-2 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-95"
                        >
                          <img
                            src={stickerToSrc(sticker)}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              {filteredStickers.length === 0 && (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl bg-slate-50 px-6 text-center">
                  <Search className="mb-3 size-6 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-700">No stickers found</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Try searching for an animal, food, or a color.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function ColoringPageShelf({
  isMobile,
  open,
  onClose,
}: {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const setTool = usePaintStore((state) => state.setTool);
  const setBackgroundImage = usePaintStore((state) => state.setBackgroundImage);
  const hasBackgroundImage = usePaintStore((state) =>
    state.images.some((image) => image.kind !== "sticker"),
  );
  const hasFreeCanvasContent = usePaintStore(
    (state) => state.strokes.length > 0 || state.images.some((image) => image.kind === "sticker"),
  );
  const activeBackgroundSrc = usePaintStore(
    (state) => state.images.find((image) => image.kind !== "sticker")?.originalSrc ?? null,
  );
  const categories = Array.from(new Set(COLORING_PAGES.map((page) => page.category)));
  const [pageConfirmOpen, setPageConfirmOpen] = useState(false);
  const [pendingPage, setPendingPage] = useState<ColoringPage | null>(null);

  const applyColoringPage = async (page: ColoringPage) => {
    const background = await buildColoringBookBackground(page);
    setBackgroundImage(background);
    onClose();
    toast.success(`${page.name} is ready to color`);
  };

  const addColoringPage = async (page: ColoringPage) => {
    if (!hasBackgroundImage && hasFreeCanvasContent) {
      setPendingPage(page);
      setPageConfirmOpen(true);
      return;
    }

    await applyColoringPage(page);
  };

  const confirmColoringPage = async () => {
    const page = pendingPage;
    if (!page) return;

    setPageConfirmOpen(false);
    setPendingPage(null);
    await applyColoringPage(page);
  };

  return (
    <>
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
                      {COLORING_PAGES.filter((page) => page.category === category).map((page) => {
                        const pageSrc = coloringPageToSrc(page);
                        const active = activeBackgroundSrc === pageSrc;

                        return (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => void addColoringPage(page)}
                            title={page.name}
                            aria-label={`Add ${page.name} coloring page`}
                            className={`group cursor-pointer overflow-hidden rounded-[1.35rem] border bg-white p-2 text-left shadow-none transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                              active
                                ? "border-cyan-300 ring-2 ring-cyan-200/70"
                                : "border-cyan-100/80 hover:border-cyan-200 hover:shadow-[0_10px_20px_-18px_rgba(8,145,178,0.28)]"
                            }`}
                          >
                            <span className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,_#ffffff_0%,_#f8fdff_58%,_#eefcff_100%)] px-3 py-2">
                              <img
                                src={pageSrc}
                                alt=""
                                className="h-full w-full object-contain opacity-95 transition-transform duration-200 group-hover:scale-[1.03]"
                                draggable={false}
                              />
                            </span>
                            <span className="mt-2 block truncate px-1 text-xs font-semibold text-slate-700">
                              {page.name}
                            </span>
                            {active && (
                              <span className="px-1 text-[11px] font-semibold text-cyan-600">
                                Current page
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <AlertDialog
        open={pageConfirmOpen}
        onOpenChange={(open) => {
          setPageConfirmOpen(open);
          if (!open) {
            setPendingPage(null);
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-32px)] max-w-[380px] rounded-[28px] border border-white/90 bg-white/95 p-5 text-[#17243a] shadow-[0_28px_70px_-36px_rgba(23,36,58,0.65)] backdrop-blur-md sm:rounded-[28px]">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex size-10 items-center justify-center rounded-[15px] bg-[#eefbff] text-cyan-700">
              <BookOpen className="size-5" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold tracking-normal text-[#17243a]">
              Switch to a Coloring Page?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-[#697b9a]">
              Your current Free Canvas mode will be replaced when you switch to a coloring page. In
              coloring mode, you can only draw inside the picture frame. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 rounded-[14px] border-0 bg-[#f1f4f8] px-4 py-2 text-sm font-semibold text-[#667a9c] shadow-none hover:bg-[#e8edf5] hover:text-[#17243a]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmColoringPage()}
              className="rounded-[14px] bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-cyan-700"
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PropertiesPanel({ isMobile }: { isMobile: boolean }) {
  const selectedId = usePaintStore((state) => state.selectedImageId);
  const image = usePaintStore((state) => state.images.find((item) => item.id === selectedId));
  const updateImage = usePaintStore((state) => state.updateImage);
  const pushHistory = usePaintStore((state) => state.pushHistory);
  const [strength, setStrength] = useState(0.75);
  const [processing, setProcessing] = useState(false);
  const isSticker = image?.kind === "sticker";
  const isColoringPage = image?.kind === "coloring-page";
  const compactMobileSticker = isMobile && isSticker;
  const compactMobileColoringPage = isMobile && isColoringPage;

  const makeColoringPage = async () => {
    if (!image) return;
    setProcessing(true);
    try {
      const outlineSrc = await imageToColoringPage(image.originalSrc, { lineStrength: strength });
      pushHistory();
      updateImage(image.id, { src: outlineSrc, isOutline: true });
      toast.success("Coloring page ready — paint away!");
    } catch {
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

  return (
    <AnimatePresence>
      {image && (
        <motion.aside
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className={`absolute z-40 flex flex-col gap-4 ${
            compactMobileSticker
              ? "paint-scrollbar inset-x-3 bottom-24 max-h-[28vh] overflow-y-auto"
              : compactMobileColoringPage
                ? "inset-x-3 bottom-[6.2rem] max-h-[26vh]"
                : isMobile
                  ? "paint-scrollbar inset-x-3 bottom-24 max-h-[44vh] overflow-y-auto"
                  : "right-4 top-24 w-72 max-w-[calc(100vw-32px)] md:top-1/2 md:-translate-y-1/2"
          }`}
        >
          <div
            className={`border border-slate-100 bg-paint-panel/95 shadow-soft backdrop-blur-xl ${
              compactMobileSticker
                ? "rounded-[1.25rem] p-3"
                : compactMobileColoringPage
                  ? "rounded-[1.2rem] p-2.5"
                  : isMobile
                    ? "rounded-[1.5rem] p-4"
                    : "rounded-[2rem] p-5"
            }`}
          >
            <h3
              className={`flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400 ${
                compactMobileSticker
                  ? "mb-2 text-[10px]"
                  : compactMobileColoringPage
                    ? "mb-2 text-[10px]"
                    : isMobile
                      ? "mb-3 text-[11px]"
                      : "mb-4 text-xs"
              }`}
            >
              <Sparkles className="size-3" />
              {isSticker ? "Sticker Tools" : isColoringPage ? "Coloring Page" : "Magic Tools"}
            </h3>

            {!isSticker && !isColoringPage && (
              <>
                <button
                  onClick={makeColoringPage}
                  disabled={processing}
                  className="mb-3 w-full rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 py-3 font-semibold text-white shadow-float transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
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
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <RotateCcw className="size-4" /> Restore original
                  </button>
                )}
              </>
            )}

            {isSticker && (
              <div
                className={`mb-4 bg-amber-50 font-medium text-amber-700 ${
                  compactMobileSticker
                    ? "rounded-xl px-3 py-2 text-[11px] leading-snug"
                    : "rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm"
                }`}
              >
                {compactMobileSticker
                  ? "Move with Select. Duplicate it or lower opacity."
                  : "Move it with Select, duplicate it, or soften it with opacity."}
              </div>
            )}

            {isColoringPage && (
              <div
                className={`mb-4 bg-cyan-50 font-medium text-cyan-800 ${
                  compactMobileColoringPage
                    ? "rounded-xl px-2.5 py-2 text-[10.5px] leading-snug"
                    : "rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm"
                }`}
              >
                Pick another page from Coloring book or import a new picture to change the
                background.
              </div>
            )}

            {!isSticker && !isColoringPage && image && (
              <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-medium leading-relaxed text-rose-700 sm:text-sm">
                This picture is your page background. Turn it into line art to make a custom
                coloring sheet.
              </div>
            )}

            <div
              className={
                compactMobileSticker || compactMobileColoringPage ? "space-y-3" : "space-y-4"
              }
            >
              {!isSticker && !isColoringPage && (
                <Slider
                  label="Line Strength"
                  value={strength}
                  onChange={setStrength}
                  min={0.2}
                  max={1}
                  compact={compactMobileSticker}
                />
              )}
              <Slider
                label="Opacity"
                value={image.opacity}
                onChange={(value) => updateImage(image.id, { opacity: value })}
                onChangeStart={pushHistory}
                min={0.1}
                max={1}
                compact={compactMobileSticker || compactMobileColoringPage}
              />
            </div>
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
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onChangeStart?: () => void;
  min: number;
  max: number;
  compact?: boolean;
}) {
  const changingRef = useRef(false);

  const finishChange = () => {
    changingRef.current = false;
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className={`flex justify-between font-medium ${compact ? "text-[11px]" : "text-xs"}`}>
        <span>{label}</span>
        <span className="text-slate-400">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => {
          if (!changingRef.current) {
            onChangeStart?.();
            changingRef.current = true;
          }
          onChange(Number(event.target.value));
        }}
        onPointerDown={finishChange}
        onPointerUp={finishChange}
        onPointerCancel={finishChange}
        onBlur={finishChange}
        className={`w-full cursor-pointer accent-pink-400 ${compact ? "h-5" : ""}`}
      />
    </div>
  );
}
