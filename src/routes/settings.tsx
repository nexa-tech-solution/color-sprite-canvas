import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, MessageCircleHeart, Pencil, Star } from "lucide-react";
import { initPlayer, playerFeaturesEnabled, usePlayerStore } from "@/lib/player";
import { PageShell } from "@/components/nav/PageShell";
import { NameSheet } from "@/components/contest/NameSheet";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const name = usePlayerStore((state) => state.name);
  const points = usePlayerStore((state) => state.points);
  const status = usePlayerStore((state) => state.status);
  const [nameOpen, setNameOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    if (playerFeaturesEnabled) void initPlayer();
  }, []);

  return (
    <PageShell title="Settings" width="max-w-xl">
      <div className="space-y-4">
        {playerFeaturesEnabled && (
          <>
            <Card label="Your name">
              <button
                type="button"
                onClick={() => setNameOpen(true)}
                className="flex w-full cursor-pointer items-center gap-3 text-left"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-violet-500 font-display text-2xl font-semibold uppercase text-white">
                  {loading && !name ? "" : (name ?? "?").slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  {loading && !name ? (
                    <span className="block h-5 w-32 animate-pulse rounded-full bg-slate-200" />
                  ) : (
                    <span className="block truncate font-display text-xl font-semibold text-slate-800">
                      {name ?? "No name yet"}
                    </span>
                  )}
                  <span className="text-sm text-slate-500">Shown on your contest drawings</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                  <Pencil className="size-4" />
                  Edit
                </span>
              </button>
            </Card>

            <Card label="Your stars">
              <div className="flex items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Star className="size-7 fill-amber-400 text-amber-500" />
                </span>
                <span className="min-w-0 flex-1">
                  {loading && points === 0 ? (
                    <span className="block h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                  ) : (
                    <span className="block font-display text-3xl font-semibold tabular-nums text-slate-800">
                      {points}
                    </span>
                  )}
                  <span className="text-sm text-slate-500">
                    Win contests to get stars. Use them to unlock special pages.
                  </span>
                </span>
              </div>
            </Card>
          </>
        )}

        <Card label="Help">
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="flex w-full cursor-pointer items-center gap-3 text-left"
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <MessageCircleHeart className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-semibold text-slate-800">
                Contact us
              </span>
              <span className="text-sm text-slate-500">
                Found a problem or have an idea? Tell us!
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-300" />
          </button>
        </Card>
      </div>

      {playerFeaturesEnabled && <NameSheet open={nameOpen} onOpenChange={setNameOpen} />}
      <FeedbackSheet open={contactOpen} onOpenChange={setContactOpen} />
    </PageShell>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_-24px_rgba(80,60,160,0.6)] ring-1 ring-slate-100">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </h2>
      {children}
    </section>
  );
}
