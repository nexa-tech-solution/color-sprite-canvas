import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ArrowDownUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LayoutGrid,
  Star,
} from "lucide-react";
import { filterOptions, sortOptions, type ProjectFilter, type ProjectSort } from "./constants";

const filterIcons = {
  all: LayoutGrid,
  recent: Clock3,
  pages: BookOpen,
  favorites: Star,
  finished: CheckCircle2,
} as const;

export function FilterStrip({
  activeFilter,
  onChange,
  activeSort,
  onSortChange,
}: {
  activeFilter: ProjectFilter;
  onChange: (filter: ProjectFilter) => void;
  activeSort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}) {
  const activeSortLabel =
    sortOptions.find((option) => option.id === activeSort)?.label ?? "Newest first";

  return (
    <section className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1 overflow-hidden rounded-[30px] border border-white/90 bg-white/88 shadow-soft backdrop-blur-md">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2 p-1.5 sm:p-2">
            {filterOptions.map((option) => {
              const Icon = filterIcons[option.id];
              const active = activeFilter === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option.id)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
                    active
                      ? "bg-[linear-gradient(180deg,_#ff7ab8,_#ff58ab)] text-white shadow-[0_16px_26px_-20px_rgba(255,88,171,0.85)] hover:bg-[linear-gradient(180deg,_#ff86c0,_#ff64b2)]"
                      : "text-[#5f688f] hover:bg-[#f3f5fc] hover:text-[#465174]"
                  }`}
                >
                  <Icon className="size-3.5 sm:size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 sm:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label={`Sort projects: ${activeSortLabel}`}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white bg-white/95 text-[#8f6fff] shadow-[0_12px_26px_-16px_rgba(79,88,128,0.45)] transition-colors hover:bg-[#faf9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f6fff] focus-visible:ring-offset-2"
            >
              <ArrowDownUp className="size-5" />
            </button>
          </DrawerTrigger>

          <DrawerContent className="rounded-t-[30px] border-white/90 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-28px_rgba(72,80,118,0.45)]">
            <DrawerHeader className="px-1 pb-3 pt-4 text-left">
              <DrawerTitle className="text-xl font-black tracking-[-0.025em] text-[#30395f]">
                Sort projects
              </DrawerTitle>
              <DrawerDescription className="text-sm text-[#697394]">
                Choose how your coloring pages are arranged.
              </DrawerDescription>
            </DrawerHeader>

            <div className="grid gap-2" role="radiogroup" aria-label="Project sort order">
              {sortOptions.map((option) => {
                const selected = option.id === activeSort;

                return (
                  <DrawerClose asChild key={option.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onSortChange(option.id)}
                      className={`flex min-h-12 cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                        selected
                          ? "bg-[#fff0f8] text-[#ff58ab]"
                          : "bg-[#f8f9fd] text-[#505a80] hover:bg-[#f3f0ff]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {selected && <Check className="size-5" aria-hidden="true" />}
                    </button>
                  </DrawerClose>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden shrink-0 items-center gap-4 sm:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Sort projects"
              className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-white bg-white/95 px-4 py-2.5 text-xs font-semibold text-[#505a80] shadow-[0_12px_26px_-16px_rgba(79,88,128,0.45)] transition-colors hover:bg-[#faf9ff] sm:text-sm"
            >
              <ArrowDownUp className="size-4 text-[#8f6fff]" />
              <span>{activeSortLabel}</span>
              <ChevronDown className="ml-1 size-4 text-[#505a80] transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-[190px] rounded-[20px] border border-white/90 bg-white/95 p-2 text-[#505a80] shadow-[0_22px_50px_-24px_rgba(72,80,118,0.5)] backdrop-blur-xl"
          >
            <DropdownMenuRadioGroup
              value={activeSort}
              onValueChange={(value) => onSortChange(value as ProjectSort)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.id}
                  value={option.id}
                  className="cursor-pointer rounded-[14px] py-2.5 pl-8 pr-3 text-xs font-semibold focus:bg-[#f6f3ff] focus:text-[#755de8] sm:text-sm"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
