import { useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, Loader2, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { COLORING_PAGES, coloringPageThumbToSrc, type ColoringPage } from "@/lib/coloringPages";
import { openImagePicker } from "@/lib/nativeBridge";
import type { CanvasImage } from "@/lib/projects";
import { buildPhotoColoringPage } from "@/components/paint/paintUtils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORY_ORDER: ColoringPage["category"][] = ["Imported", "Cute", "Fantasy", "Play"];
const CATEGORY_LABELS: Record<ColoringPage["category"], string> = {
  Imported: "Picture pages",
  Cute: "Cute friends",
  Fantasy: "Fantasy",
  Play: "Play time",
};

export type PagePick =
  | { kind: "page"; page: ColoringPage }
  | { kind: "blank" }
  | { kind: "photo"; background: CanvasImage };

/**
 * First step of "New coloring page": choose what to color before the editor
 * opens. Bottom sheet on phones, centred modal on larger screens.
 */
export function PagePickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pick: PagePick) => void;
}) {
  const sections = useMemo(() => {
    const groups = new Map<ColoringPage["category"], ColoringPage[]>();
    for (const page of COLORING_PAGES) {
      const list = groups.get(page.category) ?? [];
      list.push(page);
      groups.set(page.category, list);
    }
    return [...groups.entries()].sort(
      ([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
    );
  }, []);
  const showSectionTitles = sections.length > 1;
  const fileRef = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);

  const handlePhoto = async (file: File) => {
    setConverting(true);
    try {
      const background = await buildPhotoColoringPage(file);
      onPick({ kind: "photo", background });
    } catch {
      toast.error("Couldn't use that photo. Please try another one.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="bottom-0 left-0 top-auto flex h-[88dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 bg-[linear-gradient(180deg,_#ffffff_0%,_#f2fcff_100%)] p-0 shadow-[0_-20px_60px_-30px_rgba(23,36,58,0.5)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[min(86dvh,820px)] sm:w-[min(calc(100vw-48px),900px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
      >
        {/* Grab handle (phones). */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 sm:px-7 sm:pt-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600">
              Coloring book
            </p>
            <DialogTitle className="mt-0.5 font-display text-2xl font-semibold text-slate-800 sm:text-3xl">
              What will you color?
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              Pick a page to start. You can switch pages later too.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="size-5" />
          </DialogClose>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:px-7 sm:pb-7">
          <div className="mb-2 grid grid-cols-2 gap-3 sm:max-w-xl">
            <StartOption
              icon={<PenLine className="size-5" />}
              title="Blank canvas"
              subtitle="Draw anything"
              tone="cyan"
              onClick={() => onPick({ kind: "blank" })}
              disabled={converting}
            />
            <StartOption
              icon={<Camera className="size-5" />}
              title="From a photo"
              subtitle="Camera or photos"
              tone="violet"
              onClick={() => openImagePicker(fileRef.current)}
              disabled={converting}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handlePhoto(file);
            }}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {sections.map(([category, pages]) => (
              <SectionPages
                key={category}
                title={showSectionTitles ? CATEGORY_LABELS[category] : null}
                pages={pages}
                onPick={(page) => onPick({ kind: "page", page })}
              />
            ))}
          </div>
        </div>

        {converting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-violet-500" />
            <p className="font-display text-base font-semibold text-slate-700">
              Turning your photo into a coloring page…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionPages({
  title,
  pages,
  onPick,
}: {
  title: string | null;
  pages: ColoringPage[];
  onPick: (page: ColoringPage) => void;
}) {
  return (
    <>
      {title && (
        <h3 className="col-span-full mt-3 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h3>
      )}
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onPick(page)}
          aria-label={`Color ${page.name}`}
          className="group flex cursor-pointer flex-col rounded-xl border border-slate-200/80 bg-white p-2 text-left transition-colors hover:border-cyan-300 active:scale-[0.97]"
        >
          <span className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-white p-2">
            <img
              src={coloringPageThumbToSrc(page)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.04]"
            />
          </span>
          <span className="mt-2 block truncate px-1 font-display text-sm font-semibold text-slate-700">
            {page.name}
          </span>
        </button>
      ))}
    </>
  );
}

function StartOption({
  icon,
  title,
  subtitle,
  tone,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: "violet" | "cyan";
  onClick: () => void;
  disabled?: boolean;
}) {
  const iconTone = tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-cyan-50 text-cyan-600";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 text-left transition-colors hover:border-slate-300 active:bg-slate-50 disabled:opacity-60"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-slate-700">{title}</span>
        <span className="block truncate text-xs text-slate-400">{subtitle}</span>
      </span>
    </button>
  );
}
