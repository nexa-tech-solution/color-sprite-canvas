import { Sparkles } from "lucide-react";
import type { ProjectFilter } from "./constants";

export function EmptyFilterState({
  activeFilter,
  showingFavorites = false,
}: {
  activeFilter: ProjectFilter;
  showingFavorites?: boolean;
}) {
  return (
    <section className="rounded-[30px] border border-dashed border-[#e8ebf8] bg-white/70 px-6 py-10 text-center text-[#6c7998] shadow-soft">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff2f8] text-[#ff63af]">
        <Sparkles className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#314061] sm:text-xl">
        {showingFavorites ? "No favorite projects yet" : `No projects in ${activeFilter} yet`}
      </h2>
      <p className="mt-2 text-xs sm:text-sm">
        {showingFavorites
          ? "Tap the star on a project to add it to this list."
          : "Try another filter or create a fresh page to start a new adventure."}
      </p>
    </section>
  );
}
