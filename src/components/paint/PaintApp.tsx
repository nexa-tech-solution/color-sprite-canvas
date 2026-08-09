import { useEffect, useState } from "react";
import { COLORING_PAGES } from "@/lib/coloringPages";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { usePaintStore } from "@/stores/paintStore";
import { CanvasSurface } from "./CanvasSurface";
import { BrushDock, ToolDock, TopBar, WelcomeCard, ZoomNav } from "./PaintChrome";
import { ColoringPageShelf, PropertiesPanel, StickerShelf } from "./PaintPanels";
import { buildColoringBookBackground } from "./paintUtils";

export function PaintApp() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [stickersOpen, setStickersOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [mobileBrushSheetCollapsed, setMobileBrushSheetCollapsed] = useState(false);
  const isProjectLoaded = usePaintStore((state) => state.isProjectLoaded);
  const strokesCount = usePaintStore((state) => state.strokes.length);
  const hasBackground = usePaintStore((state) =>
    state.images.some((image) => image.kind !== "sticker"),
  );
  const tool = usePaintStore((state) => state.tool);

  const toggleStickers = () => {
    setPagesOpen(false);
    setStickersOpen((open) => !open);
  };

  const togglePages = () => {
    setStickersOpen(false);
    setPagesOpen((open) => !open);
  };

  useEffect(() => {
    if (!isProjectLoaded || hasBackground || strokesCount > 0 || COLORING_PAGES.length === 0) {
      return;
    }

    let cancelled = false;

    buildColoringBookBackground(COLORING_PAGES[0])
      .then((background) => {
        if (cancelled) return;
        usePaintStore.getState().setBackgroundImage(background, {
          keepWelcome: true,
          skipHistory: true,
        });
      })
      .catch(() => {
        // Ignore background preload failures so the editor still opens.
      });

    return () => {
      cancelled = true;
    };
  }, [hasBackground, isProjectLoaded, strokesCount]);

  useEffect(() => {
    if (!isMobile || !["pencil", "brush", "marker", "eraser"].includes(tool)) {
      setMobileBrushSheetCollapsed(false);
    }
  }, [isMobile, tool]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-paint-canvas text-slate-700">
      <CanvasSurface />
      <WelcomeCard isMobile={isMobile} />
      <TopBar
        isMobile={isMobile}
        stickersOpen={stickersOpen}
        pagesOpen={pagesOpen}
        onToggleStickers={toggleStickers}
        onTogglePages={togglePages}
      />
      <ToolDock
        isMobile={isMobile}
        stickersOpen={stickersOpen}
        pagesOpen={pagesOpen}
        onToggleStickers={toggleStickers}
        onTogglePages={togglePages}
        onBrushToolSelected={() => setMobileBrushSheetCollapsed(false)}
      />
      <ColoringPageShelf isMobile={isMobile} open={pagesOpen} onClose={() => setPagesOpen(false)} />
      <StickerShelf
        isMobile={isMobile}
        open={stickersOpen}
        onClose={() => setStickersOpen(false)}
      />
      <BrushDock
        isMobile={isMobile}
        isTablet={isTablet}
        mobileSheetCollapsed={mobileBrushSheetCollapsed}
        onMobileSheetCollapsedChange={setMobileBrushSheetCollapsed}
      />
      <PropertiesPanel isMobile={isMobile} />
      <ZoomNav
        isMobile={isMobile}
        isTablet={isTablet}
        mobileSheetCollapsed={mobileBrushSheetCollapsed}
      />
    </div>
  );
}
