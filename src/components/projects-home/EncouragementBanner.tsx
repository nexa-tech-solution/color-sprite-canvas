import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import bearImage from "@/assets/core/bear.png";

export function EncouragementBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setVisible(currentScrollY <= 10 || currentScrollY < lastScrollY - 30);
      if (Math.abs(currentScrollY - lastScrollY) > 5) {
        lastScrollY = currentScrollY;
      }
    };

    const syncScrollBehavior = () => {
      window.removeEventListener("scroll", handleScroll);
      setVisible(true);
      lastScrollY = window.scrollY;

      if (desktopQuery.matches) {
        window.addEventListener("scroll", handleScroll, { passive: true });
      }
    };

    syncScrollBehavior();
    desktopQuery.addEventListener("change", syncScrollBehavior);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      desktopQuery.removeEventListener("change", syncScrollBehavior);
    };
  }, []);

  return (
    <div
      className={`relative z-10 hidden transition-all duration-400 ease-in-out xl:pointer-events-none xl:fixed xl:inset-x-0 xl:bottom-3 xl:z-40 xl:block xl:px-5 ${
        visible
          ? "xl:translate-y-0 xl:opacity-100"
          : "xl:translate-y-[calc(100%+12px)] xl:opacity-0"
      }`}
    >
      <div className="mx-auto grid max-w-[1560px] xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-5">
        <div className="hidden xl:block" aria-hidden="true" />

        <section className="pointer-events-auto relative mx-auto flex w-full max-w-[600px] items-center gap-2.5 overflow-hidden rounded-[22px] border border-white/95 bg-white/95 px-2 py-1.5 shadow-[0_6px_16px_-8px_rgba(73,86,130,0.2),0_18px_38px_-20px_rgba(73,86,130,0.42)] backdrop-blur-xl sm:gap-4 sm:rounded-[30px] sm:px-6 sm:py-2">
          <div className="h-10 w-12 shrink-0 overflow-hidden sm:h-16 sm:w-20">
            <img
              src={bearImage}
              alt="Cheerful bear"
              className="h-full w-full scale-110 object-cover mix-blend-multiply"
              draggable={false}
            />
          </div>

          <div className="min-w-0 pr-6 sm:pr-8">
            <h2 className="text-xs font-black tracking-[-0.025em] text-[#ff5ca8] sm:text-base">
              Great job, artist!
            </h2>
            <p className="mt-1 hidden text-sm font-medium leading-relaxed text-[#4f5878] sm:block">
              Keep coloring and creating amazing things!
            </p>
          </div>

          <Sparkles className="absolute right-3 top-2.5 size-4 fill-[#ffd448] text-[#ffd448] sm:right-5 sm:top-4 sm:size-6" />
        </section>
      </div>
    </div>
  );
}
