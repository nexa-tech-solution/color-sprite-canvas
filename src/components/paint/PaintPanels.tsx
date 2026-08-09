import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { imageToColoringPage } from "@/lib/coloringPage";
import { COLORING_PAGES, coloringPageToSrc, type ColoringPage } from "@/lib/coloringPages";
import { getStickerDimensions, STICKERS, type Sticker, stickerToSrc } from "@/lib/stickers";
import { usePaintStore } from "@/stores/paintStore";
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
  const categories: Sticker["category"][] = ["Cute", "Nature", "Play"];

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
                        className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 shadow-none transition-transform hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22)] active:scale-95"
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
              ))}
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
  const activeBackgroundSrc = usePaintStore(
    (state) => state.images.find((image) => image.kind !== "sticker")?.originalSrc ?? null,
  );
  const categories = Array.from(new Set(COLORING_PAGES.map((page) => page.category)));

  const addColoringPage = async (page: ColoringPage) => {
    const background = await buildColoringBookBackground(page);
    setBackgroundImage(background);
    onClose();
    toast.success(`${page.name} is ready to color`);
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
                    {COLORING_PAGES.filter((page) => page.category === category).map((page) => {
                      const pageSrc = coloringPageToSrc(page);
                      const active = activeBackgroundSrc === pageSrc;

                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => addColoringPage(page)}
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
  );
}

export function PropertiesPanel({ isMobile }: { isMobile: boolean }) {
  const selectedId = usePaintStore((state) => state.selectedImageId);
  const image = usePaintStore((state) => state.images.find((item) => item.id === selectedId));
  const updateImage = usePaintStore((state) => state.updateImage);
  const removeImage = usePaintStore((state) => state.removeImage);
  const addImage = usePaintStore((state) => state.addImage);
  const pushHistory = usePaintStore((state) => state.pushHistory);
  const [strength, setStrength] = useState(0.75);
  const [processing, setProcessing] = useState(false);
  const isSticker = image?.kind === "sticker";
  const isColoringPage = image?.kind === "coloring-page";
  const isBackgroundImage = Boolean(image && image.kind !== "sticker");

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
              <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium leading-relaxed text-amber-700 sm:text-sm">
                Move it with Select, duplicate it, or soften it with opacity.
              </div>
            )}

            {isColoringPage && (
              <div className="mb-4 rounded-2xl bg-cyan-50 px-4 py-3 text-xs font-medium leading-relaxed text-cyan-800 sm:text-sm">
                This page is locked in place so kids only pan inside the picture while they color.
              </div>
            )}

            {!isSticker && !isColoringPage && image && (
              <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-medium leading-relaxed text-rose-700 sm:text-sm">
                This picture is your page background. Turn it into line art to make a custom
                coloring sheet.
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
                onChange={(value) => updateImage(image.id, { opacity: value })}
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
            {isBackgroundImage ? (
              <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-medium leading-relaxed text-slate-500">
                Pick another page from Coloring book or import a new picture to change the
                background.
              </div>
            ) : (
              <>
                <button
                  onClick={duplicate}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="size-4" /> Duplicate
                </button>
                <button
                  onClick={() => removeImage(image.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" /> Delete
                </button>
              </>
            )}
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
  onChange: (value: number) => void;
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
        className="w-full cursor-pointer accent-pink-400"
      />
    </div>
  );
}
