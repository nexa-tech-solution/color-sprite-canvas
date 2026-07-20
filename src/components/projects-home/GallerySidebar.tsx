import { Users } from "lucide-react";
import littleArtistLogo from "@/assets/core/little-artist.png";
import { sidebarItems, type GallerySection } from "./constants";

type GalleryNavigationProps = {
  activeSection: GallerySection;
  onSectionChange: (section: GallerySection) => void;
};

export function GallerySidebar({ activeSection, onSectionChange }: GalleryNavigationProps) {
  return (
    <aside className="hidden xl:sticky xl:top-3 xl:block xl:h-[calc(100dvh-1.5rem)] xl:self-start">
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain rounded-[36px] border border-white/90 bg-white/88 p-4 shadow-soft [scrollbar-gutter:stable] backdrop-blur-xl">
        <div className="text-center">
          <img
            src={littleArtistLogo}
            alt="Little Artists Club"
            className="mx-auto h-auto w-full max-w-[7.75rem] object-contain sm:max-w-[8.5rem]"
            draggable={false}
          />
        </div>

        <nav className="mt-5 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.id === "gallery" || item.id === "favorites") {
                  onSectionChange(item.id);
                }
              }}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-all ${
                item.id === activeSection
                  ? "bg-[linear-gradient(90deg,_rgba(255,238,246,1),_rgba(255,246,251,0.92))] text-[#ff5ca8]"
                  : "text-[#5d6788] hover:bg-[#f7f9ff]"
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center">
                <img
                  src={item.image}
                  alt=""
                  className="size-9 object-contain"
                  draggable={false}
                />
              </span>
              <span className="text-sm font-semibold sm:text-[15px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto w-full text-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#f3f0ff] px-4 py-2 text-xs font-semibold text-[#8b74ff] sm:text-sm"
          >
            <Users className="size-4" />
            Parent's zone
          </button>
        </div>
      </div>
    </aside>
  );
}

export function BottomTabNav({ activeSection, onSectionChange }: GalleryNavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 xl:hidden">
      <div className="mx-2 mb-2 flex items-center justify-around rounded-[28px] border border-white/90 bg-white/95 px-1 py-1.5 shadow-[0_-4px_24px_-8px_rgba(73,86,130,0.18),0_8px_32px_-12px_rgba(73,86,130,0.3)] backdrop-blur-xl sm:mx-4 sm:mb-3 sm:py-2">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.id === "gallery" || item.id === "favorites") {
                onSectionChange(item.id);
              }
            }}
            className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all sm:px-3 sm:py-2 ${
              item.id === activeSection
                ? "bg-[linear-gradient(180deg,_rgba(255,238,246,1),_rgba(255,246,251,0.92))] text-[#ff5ca8]"
                : "text-[#8a92b0] hover:text-[#5d6788]"
            }`}
          >
            <span className="flex size-7 items-center justify-center sm:size-10">
              <img
                src={item.image}
                alt=""
                className="size-6 object-contain sm:size-9"
                draggable={false}
              />
            </span>
            <span className="text-[10px] font-semibold leading-tight sm:text-xs">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
