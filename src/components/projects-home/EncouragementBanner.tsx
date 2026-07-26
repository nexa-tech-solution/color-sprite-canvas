import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import bearImage from "@/assets/core/bear.png";

export function EncouragementBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY <= 10) {
        setVisible(true);
      } else if (scrollDelta > 5) {
        setVisible(false);
      } else if (scrollDelta < -30) {
        setVisible(true);
      }

      if (Math.abs(scrollDelta) > 5) {
        lastScrollY = currentScrollY;
      }
    };

    const syncScrollBehavior = () => {
      window.removeEventListener("scroll", handleScroll);
      setVisible(true);
      lastScrollY = window.scrollY;
      window.addEventListener("scroll", handleScroll, { passive: true });
    };

    syncScrollBehavior();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 px-3 transition-all duration-400 ease-in-out sm:px-4 lg:px-5 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-[calc(100%+12px)] opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-[1560px] justify-center">
        <section className="pointer-events-auto relative flex w-full max-w-[600px] items-center gap-2.5 overflow-hidden rounded-[22px] border border-white/95 bg-white/95 px-2 py-1.5 shadow-[0_6px_16px_-8px_rgba(73,86,130,0.2),0_18px_38px_-20px_rgba(73,86,130,0.42)] backdrop-blur-xl sm:gap-4 sm:rounded-[30px] sm:px-6 sm:py-2">
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
