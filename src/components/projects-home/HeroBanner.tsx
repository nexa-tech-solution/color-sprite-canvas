import { Plus, Sparkles } from "lucide-react";
import pickColorAdventureTitle from "@/assets/core/pick-a-coloring-adventure-tight.png";

export function HeroBanner({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="relative w-full min-w-0 overflow-hidden py-2 sm:px-8 sm:py-5 lg:px-12 lg:py-6">
      <div className="relative mx-auto flex w-full min-w-0 max-w-[920px] flex-col items-center text-center">
        <img
          src={pickColorAdventureTitle}
          alt="Pick a coloring adventure!"
          className="block h-auto w-full object-contain"
          draggable={false}
        />

        <p className="-mt-4 max-w-[640px] px-3 text-sm leading-7 text-[#5f6894] sm:-mt-10 sm:max-w-[720px] sm:px-0 sm:text-base md:text-lg lg:max-w-[800px] lg:text-xl">
          Start something new or continue your masterpiece. Every project stays ready for the next
          little artist moment.
        </p>

        <div className="mt-4 flex w-full min-w-0 justify-center px-2">
          <button
            type="button"
            onClick={onCreateProject}
            className="group relative inline-flex max-w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(180deg,_#ff79c2_0%,_#ff4eaa_100%)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_24px_44px_-22px_rgba(255,92,168,0.8)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff58ab] focus-visible:ring-offset-2 sm:gap-3 sm:px-8 sm:py-3.5 sm:text-lg"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#ff58ab] shadow-[0_10px_22px_-16px_rgba(255,255,255,0.9)] sm:size-[3.25rem]">
              <Plus className="size-5 sm:size-7" />
            </span>
            <span className="relative min-w-0 truncate">New coloring page</span>
            <Sparkles className="relative size-4 shrink-0 text-white/90 sm:size-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
