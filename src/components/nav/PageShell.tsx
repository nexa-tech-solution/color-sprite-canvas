import type { ReactNode } from "react";
import { AppNav, useNavPageClass } from "./AppNav";

/** Page frame for the tab pages (Contests, Settings): soft background, title, app nav. */
export function PageShell({
  title,
  subtitle,
  children,
  width = "max-w-3xl",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: string;
}) {
  const navPageClass = useNavPageClass();
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#fff7ec_0%,#f9fbff_45%)] text-slate-900">
      <div className={`px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] ${navPageClass}`}>
        <div className={`mx-auto ${width}`}>
          {title && (
            <header className="mb-5 px-1">
              <h1 className="font-display text-3xl font-semibold text-slate-800">{title}</h1>
              {subtitle && <p className="mt-1 text-[15px] text-slate-500">{subtitle}</p>}
            </header>
          )}
          {children}
        </div>
      </div>
      <AppNav />
    </main>
  );
}
