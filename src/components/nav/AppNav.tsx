import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Palette, Settings, Star, Trophy, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { create } from "zustand";
import { initPlayer, playerFeaturesEnabled, usePlayerStore } from "@/lib/player";

type NavItem = {
  to: "/" | "/contests" | "/settings";
  label: string;
  icon: LucideIcon;
  /** Active tile colours. */
  tint: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home, tint: "bg-pink-500 text-white" },
  { to: "/contests", label: "Contests", icon: Trophy, tint: "bg-amber-400 text-amber-950" },
  { to: "/settings", label: "Settings", icon: Settings, tint: "bg-violet-500 text-white" },
];

const COLLAPSED_KEY = "pastel-paint.nav-collapsed";

/** Sidebar collapsed (icons only) — tap the logo to toggle; remembered per device. */
const useNavStore = create<{ collapsed: boolean }>(() => ({ collapsed: false }));

function setCollapsed(collapsed: boolean) {
  useNavStore.setState({ collapsed });
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // storage blocked: just don't remember it
  }
}

/** Left padding / bottom padding a page needs so the nav never covers it. */
export function useNavPageClass({ bottomTabs = true }: { bottomTabs?: boolean } = {}) {
  const collapsed = useNavStore((state) => state.collapsed);
  const bottom = bottomTabs
    ? "pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]"
    : "pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";
  return `${collapsed ? "lg:pl-[6.5rem]" : "lg:pl-[17rem]"} ${bottom} lg:pb-8 lg:transition-[padding] lg:duration-200`;
}

function useIsActive() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (to: NavItem["to"]) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
}

/**
 * Sidebar on large screens, bottom tab bar on phones/tablets.
 * Detail screens pass `bottomTabs={false}`: they have their own back button and a bottom action.
 */
export function AppNav({ bottomTabs = true }: { bottomTabs?: boolean } = {}) {
  return (
    <>
      <Sidebar />
      {bottomTabs && <BottomTabs />}
    </>
  );
}

function Sidebar() {
  const isActive = useIsActive();
  const name = usePlayerStore((state) => state.name);
  const points = usePlayerStore((state) => state.points);
  const collapsed = useNavStore((state) => state.collapsed);

  useEffect(() => {
    if (playerFeaturesEnabled) void initPlayer();
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === "1") useNavStore.setState({ collapsed: true });
    } catch {
      // ignore
    }
  }, []);

  return (
    <aside
      className={`fixed bottom-3 left-3 top-3 z-40 hidden flex-col overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-3 shadow-[0_18px_40px_-26px_rgba(80,60,160,0.55)] backdrop-blur-xl transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[5.25rem]" : "w-60"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Open menu" : "Make menu smaller"}
        aria-expanded={!collapsed}
        title={collapsed ? "Open menu" : "Make menu smaller"}
        className="flex cursor-pointer items-center gap-2.5 rounded-2xl p-1.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 text-white shadow-md">
          <Palette className="size-6" />
        </span>
        {!collapsed && (
          <span className="font-display text-xl font-semibold text-slate-800">Coloring</span>
        )}
      </button>

      <nav className="mt-5 space-y-1" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-2xl p-1.5 font-display text-[15px] font-semibold transition-colors ${
                active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active ? item.tint : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {playerFeaturesEnabled && (
        <Link
          to="/settings"
          title={collapsed ? `${name ?? "Artist"} · ${points} stars` : undefined}
          className={`mt-auto flex items-center gap-2.5 rounded-2xl ${collapsed ? "justify-center p-1.5" : "bg-slate-50 p-2.5 ring-1 ring-slate-100"}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-500 font-display text-sm font-semibold uppercase text-white">
            {(name ?? "?").slice(0, 1)}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-semibold text-slate-700">
                {name ?? "Artist"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Star className="size-3.5 fill-amber-400 text-amber-500" />
                {points} stars
              </span>
            </span>
          )}
        </Link>
      )}
    </aside>
  );
}

function BottomTabs() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[26px] border border-white/90 bg-white/95 p-1.5 shadow-[0_-4px_24px_-8px_rgba(73,86,130,0.18),0_8px_32px_-12px_rgba(73,86,130,0.3)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[5.5rem] flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-colors ${
                active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? item.tint : ""
                }`}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
