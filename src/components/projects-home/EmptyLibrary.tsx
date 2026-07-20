import { PenLine, Plus } from "lucide-react";

export function EmptyLibrary({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="overflow-hidden rounded-[38px] border border-white/90 bg-white/92 p-6 shadow-soft backdrop-blur-md sm:p-8">
      <div className="flex flex-col items-center rounded-[30px] bg-[linear-gradient(135deg,_rgba(255,245,251,0.98),_rgba(238,247,255,0.96))] px-5 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-white text-[#ff66b2] shadow-[0_20px_36px_-24px_rgba(255,102,178,0.7)]">
          <PenLine className="size-7" />
        </div>
        <h2 className="mt-5 text-[1.7rem] font-black tracking-[-0.06em] text-[#2d3760] sm:text-3xl">
          Your first coloring page starts here.
        </h2>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#6a7897] sm:text-sm">
          Tap the big pink button to open a fresh page, choose a picture, and build a cozy gallery
          for every little masterpiece.
        </p>
        <button
          onClick={onCreateProject}
          className="mt-6 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(180deg,_#ff7ab8,_#ff58ab)] px-6 py-3 text-xs font-bold text-white shadow-[0_24px_38px_-24px_rgba(255,88,171,0.8)] transition-transform duration-200 hover:-translate-y-0.5 sm:text-sm"
        >
          <Plus className="size-5" />
          Make a new coloring page
        </button>
      </div>
    </section>
  );
}
