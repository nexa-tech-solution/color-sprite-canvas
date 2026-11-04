import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  COLORING_PAGES,
  PREMIUM_PAGES,
  coloringPageThumbToSrc,
  findColoringPage,
} from "@/lib/coloringPages";
import { contestPhase, type Contest } from "@/lib/contests";
import { getAdminSupabase, isBackendConfigured } from "@/lib/supabase";
import { ConfirmHost, confirmAction } from "@/components/admin/ConfirmDialog";
import { ChatDrawer } from "@/components/contest/ChatDrawer";
import { playChime } from "@/lib/chime";
import {
  countUnread,
  fetchContestMessages,
  mergeMessage,
  subscribeToMessages,
  type ChatMessage,
} from "@/lib/chat";
import scoresSql from "../../supabase/migrations/0003_scores_leaderboard.sql?raw";
import deletePlayerSql from "../../supabase/migrations/0004_admin_delete_player.sql?raw";
import publishedAtSql from "../../supabase/migrations/0005_results_published_at.sql?raw";
import chatSql from "../../supabase/migrations/0008_submission_chat.sql?raw";
import realtimeSql from "../../supabase/migrations/0007_realtime_submissions.sql?raw";
import { create } from "zustand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Coloring Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

interface AdminSubmission {
  id: string;
  contest_id: string;
  device_id: string;
  player_name: string;
  image_path: string;
  rank: number | null;
  score: number | null;
  created_at: string;
  updated_at: string;
}

interface PlayerRow {
  device_id: string;
  name: string;
  points: number;
}

type Tab = "contests" | "players";

const PHASE_LABEL = {
  upcoming: "Upcoming",
  live: "Live",
  judging: "Needs judging",
  finished: "Published",
} as const;

function AdminPage() {
  const supabase = getAdminSupabase();
  // undefined = still reading the stored session (render nothing instead of flashing the form)
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(null);
      return;
    }
    void supabase.rpc("is_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session, supabase]);

  if (!isBackendConfigured) {
    return (
      <Frame>
        <p className="text-slate-600">
          Backend not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </Frame>
    );
  }

  // Server render has no client/session: render the same blank shell on both sides.
  if (!supabase || session === undefined) return <main className="min-h-[100dvh] bg-slate-50" />;

  // Keep the form on screen (button spinning) while we check the judge role.
  if (!session || isAdmin === null) {
    return <Login supabase={supabase} pending={Boolean(session)} />;
  }

  if (!isAdmin) {
    return (
      <Frame>
        <p className="text-slate-700">
          <b>{session.user.email}</b> is not a judge. Add this user id to the <code>admins</code>{" "}
          table:
        </p>
        <code className="mt-2 block rounded bg-slate-100 p-2 text-xs">{session.user.id}</code>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Sign out
        </button>
      </Frame>
    );
  }

  return <Dashboard supabase={supabase} email={session.user.email ?? ""} />;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold text-slate-800">
          <Trophy className="size-6 text-amber-500" /> Coloring Admin
        </h1>
        {children}
      </div>
    </main>
  );
}

/** Supabase auth needs an email; a plain username like "admin" maps to "admin@coloring.admin". */
const ADMIN_EMAIL_DOMAIN = "coloring.admin";
const toLoginEmail = (username: string) =>
  username.includes("@")
    ? username.trim()
    : `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;

function Login({ supabase, pending = false }: { supabase: SupabaseClient; pending?: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(username),
      password,
    });
    setBusy(false);
    if (error)
      toast.error(
        error.message === "Invalid login credentials"
          ? "Wrong username or password"
          : error.message,
      );
  };

  return (
    <Frame>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username">
          <input
            required
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </Field>
        <button type="submit" disabled={busy || pending} className={BUTTON}>
          {busy || pending ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
        </button>
      </form>
    </Frame>
  );
}

/** Contest the judge most likely wants: needs judging > live > upcoming > latest. */
function pickDefaultContest(contests: Contest[]) {
  const order = ["judging", "live", "upcoming", "finished"] as const;
  for (const phase of order) {
    const match = contests.find((contest) => contestPhase(contest) === phase);
    if (match) return match;
  }
  return null;
}

const PHASE_DOT = {
  upcoming: "bg-sky-500",
  live: "bg-emerald-500",
  judging: "bg-amber-500",
  finished: "bg-slate-300",
} as const;

function Dashboard({ supabase, email }: { supabase: SupabaseClient; email: string }) {
  const [tab, setTab] = useState<Tab>("contests");
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contest | "new" | null>(null);

  const loadContests = useCallback(async () => {
    const { data, error } = await supabase
      .from("contest_overview")
      .select("*")
      .order("starts_at", { ascending: false });
    if (error) reportError(error);
    setContests((data ?? []) as Contest[]);
  }, [supabase]);

  useEffect(() => {
    void loadContests();
  }, [loadContests]);

  // First load: select a sensible contest, or open the form when there are none.
  useEffect(() => {
    if (!contests || editing) return;
    if (selected && contests.some((contest) => contest.id === selected)) return;
    const first = pickDefaultContest(contests);
    if (first) setSelected(first.id);
    else setEditing("new");
  }, [contests, editing, selected]);

  const list = contests ?? [];
  const current = list.find((contest) => contest.id === selected) ?? null;
  const signOut = () => void supabase.auth.signOut();

  const nav = (
    <>
      <NavItem
        active={tab === "contests"}
        onClick={() => setTab("contests")}
        icon={<Trophy className="size-4" />}
      >
        Contests
      </NavItem>
      <NavItem
        active={tab === "players"}
        onClick={() => setTab("players")}
        icon={<Users className="size-4" />}
      >
        Players
      </NavItem>
    </>
  );

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 text-slate-800">
      <ConfirmHost />
      <SetupHost />
      {/* Sidebar (tablet/desktop) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <Trophy className="size-5 text-amber-500" />
          <span className="font-display text-lg font-semibold">Coloring Admin</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">{nav}</nav>
        <div className="mt-auto border-t border-slate-200 p-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="size-4" /> Back to app
          </Link>
          <div className="mt-1 flex items-center gap-2 rounded-md px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-600">
              {email.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{email}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (phones) */}
        <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 md:hidden">
          <Link to="/" className="rounded-md p-1.5 text-slate-500" aria-label="Back to app">
            <ChevronLeft className="size-5" />
          </Link>
          <nav className="flex gap-1">{nav}</nav>
          <button
            type="button"
            onClick={signOut}
            className="ml-auto rounded-md p-2 text-slate-500"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </header>

        {tab === "players" ? (
          <>
            <PageHeader title="Players" />
            <Players supabase={supabase} />
          </>
        ) : (
          <>
            <PageHeader title="Contests">
              <button
                type="button"
                onClick={() => {
                  setEditing("new");
                  setSelected(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                <Plus className="size-4" /> New contest
              </button>
            </PageHeader>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="border-b border-slate-200 bg-white lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
                {contests === null ? (
                  <ul
                    aria-busy="true"
                    aria-label="Loading contests"
                    className="divide-y divide-slate-100"
                  >
                    {[0, 1, 2].map((item) => (
                      <li key={item} className="space-y-2 px-4 py-3">
                        <Bone className="h-4 w-40" />
                        <Bone className="h-3 w-56" />
                      </li>
                    ))}
                  </ul>
                ) : list.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No contests yet.</p>
                ) : (
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto lg:max-h-none">
                    {list.map((contest) => {
                      const phase = contestPhase(contest);
                      const active = selected === contest.id && !editing;
                      return (
                        <li key={contest.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(contest.id);
                              setEditing(null);
                            }}
                            className={`w-full px-4 py-3 text-left transition-colors ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`size-2 shrink-0 rounded-full ${PHASE_DOT[phase]}`}
                              />
                              <span className="truncate text-sm font-medium">{contest.title}</span>
                            </span>
                            <span className="mt-0.5 block pl-4 text-xs text-slate-500">
                              {PHASE_LABEL[phase]} · {contest.entries}/{contest.max_participants} ·{" "}
                              {fmt(contest.ends_at)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <section className="min-w-0 flex-1 p-4 sm:p-6">
                {editing ? (
                  <ContestForm
                    supabase={supabase}
                    contest={editing === "new" ? null : editing}
                    onDone={async (id) => {
                      // Reload first: closing the form before the new contest is in the list made the
                      // auto-select pick another contest (or reopen "New contest") instead of this one.
                      await loadContests();
                      if (id) setSelected(id);
                      setEditing(null);
                    }}
                  />
                ) : contests === null ? (
                  <JudgingSkeleton />
                ) : current ? (
                  <Judging
                    key={current.id}
                    supabase={supabase}
                    contest={current}
                    onEdit={() => setEditing(current)}
                    onChanged={loadContests}
                  />
                ) : null}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      {children}
    </div>
  );
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ContestForm({
  supabase,
  contest,
  onDone,
}: {
  supabase: SupabaseClient;
  contest: Contest | null;
  onDone: (id?: string) => void | Promise<void>;
}) {
  const now = Date.now();
  const [title, setTitle] = useState(contest?.title ?? "");
  const [description, setDescription] = useState(contest?.description ?? "");
  const [pageId, setPageId] = useState(contest?.page_id ?? "");
  const [startsAt, setStartsAt] = useState(
    toLocalInput(contest?.starts_at ?? new Date(now).toISOString()),
  );
  const [endsAt, setEndsAt] = useState(
    toLocalInput(contest?.ends_at ?? new Date(now + 7 * 86400000).toISOString()),
  );
  const [max, setMax] = useState(contest?.max_participants ?? 50);
  const [prizes, setPrizes] = useState<number[]>(contest?.prizes ?? [100, 60, 30]);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const row = {
      title: title.trim(),
      description: description.trim(),
      page_id: pageId || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      max_participants: max,
      prizes,
    };
    const query = contest
      ? supabase.from("contests").update(row).eq("id", contest.id).select("id").single()
      : supabase.from("contests").insert(row).select("id").single();
    const { data, error } = await query;
    if (error) {
      setBusy(false);
      reportError(error);
      return;
    }
    toast.success(contest ? "Contest updated" : "Contest created");
    await onDone(data.id as string);
  };

  const remove = async () => {
    if (!contest) return;
    const ok = await confirmAction({
      title: `Delete "${contest.title}"?`,
      description: "The contest and all its entries will be removed. This can't be undone.",
      confirmLabel: "Delete contest",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("contests").delete().eq("id", contest.id);
    if (error) reportError(error);
    else await onDone();
  };

  return (
    <form
      onSubmit={save}
      className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-800">
        {contest ? "Edit contest" : "New contest"}
      </h2>
      <Field label="Title">
        <input
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Description (shown to kids)">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT}
        />
      </Field>
      <Field label="Picture to color">
        <div className="flex items-center gap-3">
          <PagePreview pageId={pageId} />
          <select
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            className={`${INPUT} min-w-0 flex-1`}
          >
            <option value="">Free choice (blank canvas)</option>
            {[...COLORING_PAGES, ...PREMIUM_PAGES].map((page) => (
              <option key={page.id} value={page.id}>
                {page.premium ? "⭐ " : ""}
                {page.name}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Starts">
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Ends">
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Max players">
          <input
            type="number"
            min={1}
            required
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Prizes (stars) for 1st / 2nd / 3rd">
        <div className="grid grid-cols-3 gap-2">
          {prizes.map((prize, index) => (
            <input
              key={index}
              type="number"
              min={0}
              value={prize}
              onChange={(e) =>
                setPrizes(prizes.map((p, i) => (i === index ? Number(e.target.value) : p)))
              }
              className={INPUT}
            />
          ))}
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={`${BUTTON} w-auto px-5`}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        {contest && (
          <button
            type="button"
            onClick={() => void remove()}
            className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function Judging({
  supabase,
  contest,
  onEdit,
  onChanged,
}: {
  supabase: SupabaseClient;
  contest: Contest;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [entries, setEntries] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [zoom, setZoom] = useState<AdminSubmission | null>(null);
  const [page, setPage] = useState(0);
  const phase = contestPhase(contest);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("contest_id", contest.id)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      reportError(error);
      return;
    }
    const rows = (data ?? []) as AdminSubmission[];
    setEntries(rows);
  }, [contest.id, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates (Supabase Realtime, migration 0007): a kid sends or re-sends a drawing → it shows up
  // here without pressing refresh. Without the migration nothing arrives and refresh still works.
  // Delete events can't be filtered by contest, so deletes (done from this page) aren't listened for.
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  useEffect(() => {
    const channel = supabase
      .channel(`admin-submissions-${contest.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `contest_id=eq.${contest.id}`,
        },
        (payload) => {
          if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE") return;
          const row = payload.new as AdminSubmission;
          setEntries((current) =>
            current.some((item) => item.id === row.id)
              ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item))
              : [...current, row],
          );
          if (payload.eventType === "INSERT") {
            toast.success(`New drawing from ${row.player_name}`);
            void onChangedRef.current(); // entry count in the contest list
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [contest.id, supabase]);

  const imageUrl = useCallback(
    (entry: AdminSubmission) =>
      `${supabase.storage.from("submissions").getPublicUrl(entry.image_path).data.publicUrl}?v=${encodeURIComponent(entry.updated_at)}`,
    [supabase],
  );

  /** Live preview of the final places: score high → low, ties → sent first. */
  const rankOf = useMemo(() => {
    const map = new Map<string, number>();
    if (contest.results_published) {
      entries.forEach((entry) => entry.rank && map.set(entry.id, entry.rank));
      return map;
    }
    [...entries]
      .filter((entry) => entry.score != null)
      .sort((a, b) => b.score! - a.score! || +new Date(a.created_at) - +new Date(b.created_at))
      .forEach((entry, index) => map.set(entry.id, index + 1));
    return map;
  }, [contest.results_published, entries]);

  const scored = entries.filter((entry) => entry.score != null).length;
  const pageCount = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageEntries = entries.slice(
    currentPage * ENTRIES_PER_PAGE,
    (currentPage + 1) * ENTRIES_PER_PAGE,
  );

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  // Chat: every message of this contest (for unread badges), live over Realtime (migration 0008).
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatWith, setChatWith] = useState<AdminSubmission | null>(null);
  const chatWithRef = useRef(chatWith);
  chatWithRef.current = chatWith;
  const [, bumpSeen] = useState(0); // re-render badges after the drawer marks a thread read

  useEffect(() => {
    let alive = true;
    // Quietly skip if the chat table isn't installed yet; sending will offer the setup SQL.
    fetchContestMessages(supabase, contest.id)
      .then((list) => alive && setMessages(list))
      .catch((error) => console.warn("[admin] chat unavailable", error?.message));
    const stop = subscribeToMessages(supabase, { contestId: contest.id }, (message) => {
      setMessages((current) => mergeMessage(current, message));
      if (message.sender === "artist" && chatWithRef.current?.id !== message.submission_id) {
        playChime();
        const entry = entriesRef.current.find((e) => e.id === message.submission_id);
        toast(`💬 ${entry?.player_name ?? "An artist"}: ${message.body.slice(0, 80)}`, {
          action: entry ? { label: "Open chat", onClick: () => setChatWith(entry) } : undefined,
        });
      }
    });
    return () => {
      alive = false;
      stop();
    };
  }, [contest.id, supabase]);
  const setScore = async (entry: AdminSubmission, score: number) => {
    const next = entry.score === score ? null : score;
    setEntries((current) =>
      current.map((item) => (item.id === entry.id ? { ...item, score: next } : item)),
    );
    const { error } = await supabase.from("submissions").update({ score: next }).eq("id", entry.id);
    if (error) {
      reportError(error);
      await load();
    }
  };

  const publish = async () => {
    if (scored === 0) {
      toast.error("Give at least one drawing a score");
      return;
    }
    const podium = [...rankOf.entries()]
      .filter(([, rank]) => rank <= 3)
      .sort((a, b) => a[1] - b[1])
      .map(([id, rank]) => `${rank}. ${entries.find((e) => e.id === id)?.player_name}`)
      .join("\n");
    const unscored = entries.length - scored;
    const ok = await confirmAction({
      title: "Publish the ranking and give prize stars?",
      description: `${podium}${
        unscored ? `\n\n${unscored} drawing(s) have no score and will be ranked last.` : ""
      }\n\nThis can't be undone.`,
      confirmLabel: "Publish ranking",
    });
    if (!ok) return;
    setPublishing(true);
    const { error } = await supabase.rpc("publish_ranking", { p_contest_id: contest.id });
    setPublishing(false);
    if (error) {
      reportError(error);
      return;
    }
    toast.success("Ranking published — winners got their stars!");
    await onChanged();
    await load();
  };

  const removeEntry = async (entry: AdminSubmission) => {
    const ok = await confirmAction({
      title: `Remove ${entry.player_name}'s drawing?`,
      description:
        "Use this for inappropriate content. The drawing is deleted and can't be restored.",
      confirmLabel: "Remove drawing",
      tone: "danger",
    });
    if (!ok) return;
    await supabase.storage.from("submissions").remove([entry.image_path]);
    const { error } = await supabase.from("submissions").delete().eq("id", entry.id);
    if (error) reportError(error);
    await load();
    await onChanged();
  };

  // Works in every phase (the Edit form, which also has Delete, is hidden once results are published).
  const removeContest = async () => {
    const count = entries.length;
    const ok = await confirmAction({
      title: `Delete "${contest.title}"?`,
      description: `The contest and its ${count} ${count === 1 ? "entry" : "entries"} (drawings included) will be removed. This can't be undone.`,
      confirmLabel: "Delete contest",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    // Drawings live in Storage, which the row cascade doesn't reach.
    const paths = entries.map((entry) => entry.image_path).filter(Boolean);
    if (paths.length) {
      const { error } = await supabase.storage.from("submissions").remove(paths);
      if (error) toast.error(`Couldn't remove drawings: ${error.message}`);
    }
    const { data, error } = await supabase
      .from("contests")
      .delete()
      .eq("id", contest.id)
      .select("id");
    setDeleting(false);
    if (error) {
      reportError(error);
      return;
    }
    if (!data?.length) {
      toast.error("Nothing was deleted. Check that this account is an admin.");
      return;
    }
    toast.success(`Deleted "${contest.title}"`);
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{contest.title}</h2>
          <p className="text-sm text-slate-500">
            {PHASE_LABEL[phase]} · {entries.length} entries
            {!contest.results_published && ` · ${scored} scored`} · prizes{" "}
            {contest.prizes.join(" / ")} stars
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-wait"
            aria-label="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => void removeContest()}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
          {!contest.results_published && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Edit
            </button>
          )}
          {!contest.results_published && (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || phase === "upcoming" || scored === 0}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
              title={
                phase === "live"
                  ? "Contest is still running — you can still publish early"
                  : undefined
              }
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trophy className="size-4" />
              )}
              Publish ranking
            </button>
          )}
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <EntryGridSkeleton />
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500">
          No entries yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
            {pageEntries.map((entry) => {
              const rank = rankOf.get(entry.id);
              return (
                <figure
                  key={entry.id}
                  className={`relative overflow-hidden rounded-lg border bg-white ${rank && rank <= 3 ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"}`}
                >
                  {rank && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-white/95 px-2 py-0.5 text-sm font-bold text-slate-800 shadow ring-1 ring-slate-200">
                      {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setZoom(entry)}
                    className="block w-full cursor-zoom-in bg-slate-50"
                  >
                    <img
                      src={imageUrl(entry)}
                      alt={entry.player_name}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-contain"
                    />
                  </button>
                  <figcaption className="p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {entry.player_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeEntry(entry)}
                        aria-label={`Remove ${entry.player_name}'s drawing`}
                        title="Remove drawing"
                        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400">{fmt(entry.updated_at)}</div>
                    {!contest.results_published ? (
                      <>
                        <div className="mt-2 flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <span>Score</span>
                          <span className={entry.score != null ? "text-slate-700" : ""}>
                            {entry.score != null ? `${entry.score}/10` : "not scored"}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-10 gap-0.5" aria-label="Score 1 to 10">
                          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => void setScore(entry, value)}
                              aria-pressed={entry.score === value}
                              className={`rounded py-1 text-xs font-bold tabular-nums ${
                                entry.score === value
                                  ? "bg-slate-900 text-white"
                                  : entry.score != null && value < entry.score
                                    ? "bg-slate-200 text-slate-600"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      entry.score != null && (
                        <div className="mt-1 text-sm text-slate-500">Score {entry.score}/10</div>
                      )
                    )}
                    <ChatButton
                      count={messages.filter((m) => m.submission_id === entry.id).length}
                      unread={
                        chatWith?.id === entry.id ? 0 : countUnread(messages, "judge", entry.id)
                      }
                      onClick={() => setChatWith(entry)}
                    />
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <Pager
            page={currentPage}
            pageCount={pageCount}
            total={entries.length}
            perPage={ENTRIES_PER_PAGE}
            noun="entries"
            onChange={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      <ChatDrawer
        supabase={supabase}
        submissionId={chatWith?.id ?? null}
        me="judge"
        artistName={chatWith?.player_name ?? ""}
        imageUrl={chatWith ? imageUrl(chatWith) : undefined}
        onClose={() => {
          setChatWith(null);
          bumpSeen((n) => n + 1);
        }}
        onError={(error) => {
          reportError(error as { code?: string; message: string });
          return (error as { message?: string })?.message ?? "Couldn't send";
        }}
        onMessage={(message) => setMessages((current) => mergeMessage(current, message))}
      />

      {zoom && (
        <button
          type="button"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
        >
          <img
            src={imageUrl(zoom)}
            alt={zoom.player_name}
            className="max-h-full max-w-full rounded-lg bg-white object-contain"
          />
        </button>
      )}
    </div>
  );
}

function Players({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("player_points")
      .select("*")
      .order("points", { ascending: false })
      .limit(500);
    if (error) reportError(error);
    setRows((data ?? []) as PlayerRow[]);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removePlayer = async (row: PlayerRow) => {
    const ok = await confirmAction({
      title: `Delete ${row.name}?`,
      description:
        "Removes the player, their contest entries and drawings, and all their stars. This can't be undone.\n\nIf that device opens the app again, it starts over as a new player.",
      confirmLabel: "Delete player",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(row.device_id);
    // Drawings live in Storage, which the row cascade doesn't reach.
    const { data: drawings } = await supabase
      .from("submissions")
      .select("image_path")
      .eq("device_id", row.device_id);
    const paths = (drawings ?? []).map((item) => item.image_path as string).filter(Boolean);
    if (paths.length) await supabase.storage.from("submissions").remove(paths);
    const { error } = await supabase.rpc("admin_delete_player", { p_device_id: row.device_id });
    setDeletingId(null);
    if (error) {
      reportError(error);
      return;
    }
    toast.success(`Deleted ${row.name}`);
    await load();
  };

  const saveStars = async (row: PlayerRow, delta: number) => {
    const { error } = await supabase.rpc("admin_adjust_points", {
      p_device_id: row.device_id,
      p_delta: delta,
      p_note: "manual",
    });
    if (error) {
      reportError(error);
      return false;
    }
    toast.success(`${delta > 0 ? "+" : ""}${delta} stars for ${row.name}`);
    await load();
    return true;
  };

  // Keep the leaderboard position (#) even while searching or paging.
  const filtered = rows
    .map((row, index) => ({ row, position: index + 1 }))
    .filter(({ row }) => row.name.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PLAYERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    currentPage * PLAYERS_PER_PAGE,
    (currentPage + 1) * PLAYERS_PER_PAGE,
  );
  const search = (next: string) => {
    setQuery(next);
    setPage(0);
  };

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search players"
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && search("")}
          className={`${INPUT} pl-9 pr-10`}
          aria-label="Search players"
        />
        {query && (
          <button
            type="button"
            onClick={() => search("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Stars</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody aria-busy={!loaded}>
            {!loaded &&
              [0, 1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <Bone className="h-3 w-4" />
                  </td>
                  <td className="px-3 py-3">
                    <Bone className="h-3.5 w-44" />
                  </td>
                  <td className="px-3 py-3">
                    <Bone className="ml-auto h-3.5 w-8" />
                  </td>
                  <td className="px-3 py-3">
                    <Bone className="ml-auto h-3.5 w-10" />
                  </td>
                </tr>
              ))}
            {pageRows.map(({ row, position }) => (
              <tr key={row.device_id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-400">{position}</td>
                <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.points}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="inline-flex size-7 items-center justify-center rounded-md align-middle text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                    aria-label={`Edit stars for ${row.name}`}
                    title="Edit stars"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePlayer(row)}
                    disabled={deletingId === row.device_id}
                    className="ml-1 inline-flex size-7 items-center justify-center rounded-md align-middle text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label={`Delete ${row.name}`}
                    title="Delete player"
                  >
                    {deletingId === row.device_id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loaded && filtered.length === 0 && (
          <p className="p-4 text-slate-500">
            {rows.length === 0 ? (
              "No players yet."
            ) : (
              <>
                No players match "{query}".{" "}
                <button
                  type="button"
                  onClick={() => search("")}
                  className="font-semibold text-violet-600 hover:underline"
                >
                  Clear search
                </button>
              </>
            )}
          </p>
        )}
      </div>
      <Pager
        page={currentPage}
        pageCount={pageCount}
        total={filtered.length}
        perPage={PLAYERS_PER_PAGE}
        noun="players"
        onChange={setPage}
      />
      <EditStarsDialog
        player={editing}
        onClose={() => setEditing(null)}
        onSave={async (delta) => {
          if (editing && (await saveStars(editing, delta))) setEditing(null);
        }}
      />
    </div>
  );
}

const ENTRIES_PER_PAGE = 12;
const PLAYERS_PER_PAGE = 10;

/** "1–12 of 40" with previous/next; buttons are disabled when everything fits on one page. */
function Pager({
  page,
  pageCount,
  total,
  perPage,
  noun,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  noun: string;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = page * perPage + 1;
  const to = Math.min(total, (page + 1) * perPage);
  const button =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav
      aria-label={`${noun} pages`}
      className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500"
    >
      <span className="tabular-nums">
        {from}–{to} of {total} {noun}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className={button}
        >
          <ChevronLeft className="size-4" /> Prev
        </button>
        <span className="tabular-nums">
          Page {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount - 1}
          className={button}
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

/** Opens the chat with this artist; a red badge counts messages not read yet. */
function ChatButton({
  count,
  unread,
  onClick,
}: {
  count: number;
  unread: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
        unread
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      <MessageSquare key={unread} className={`size-3.5 ${unread ? "chat-ring" : ""}`} />
      {count ? `Chat (${count})` : "Chat"}
      {unread > 0 && (
        <span className="rounded-full bg-rose-500 px-1.5 text-[10px] leading-4 text-white">
          {unread} new
        </span>
      )}
    </button>
  );
}

// Migrations the admin page relies on. All are safe to run again, so the setup dialog always offers all of them.
const SETUP_SQL =
  [scoresSql, deletePlayerSql, publishedAtSql, realtimeSql, chatSql]
    .map((sql) => sql.trim())
    .join("\n\n") + "\n";
// 42703 missing column · PGRST202 missing function · PGRST204 missing column (writes) · PGRST205 missing table/view
const MISSING_SCHEMA = new Set(["42703", "PGRST202", "PGRST204", "PGRST205"]);
const useSetupStore = create<{ open: boolean }>(() => ({ open: false }));

/** Toast a Supabase error, or open the one-time setup when the database is behind the code. */
function reportError(error: { code?: string; message: string }) {
  if (error.code && MISSING_SCHEMA.has(error.code)) useSetupStore.setState({ open: true });
  else toast.error(error.message);
}

function SetupHost() {
  const open = useSetupStore((state) => state.open);
  return (
    <SetupSqlDialog
      open={open}
      onClose={() => useSetupStore.setState({ open: false })}
      title="Database update needed"
      sql={SETUP_SQL}
    />
  );
}

/** Shown when a feature needs SQL the database doesn't have yet: what to run, and a copy button. */
function SetupSqlDialog({
  open,
  onClose,
  title,
  sql,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sql: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the SQL and copy it by hand.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl rounded-2xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            The database doesn't have this feature yet. Open Supabase → <b>SQL Editor</b>, paste the
            SQL below, press <b>Run</b>, then try again. You only need to do this once.
          </DialogDescription>
        </DialogHeader>
        <div className="relative min-w-0">
          <pre className="max-h-64 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-4 pt-12 text-xs leading-relaxed text-slate-100">
            {sql.trim()}
          </pre>
          <button
            type="button"
            onClick={() => void copy()}
            className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Got it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STAR_STEPS = [-10, -5, 5, 10, 20];

/** Add or take away stars for one player, with the new total shown before saving. */
function EditStarsDialog({
  player,
  onClose,
  onSave,
}: {
  player: PlayerRow | null;
  onClose: () => void;
  onSave: (delta: number) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(""), [player?.device_id]);

  const delta = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(delta) && delta !== 0;
  const total = (player?.points ?? 0) + (valid ? delta : 0);
  const negative = total < 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || negative || saving) return;
    setSaving(true);
    await onSave(delta);
    setSaving(false);
  };

  return (
    <Dialog open={Boolean(player)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit stars</DialogTitle>
            <DialogDescription>
              {player?.name} has <b className="text-slate-700">{player?.points ?? 0}</b> stars. Use
              a minus to take stars away.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <input
              autoFocus
              inputMode="numeric"
              placeholder="e.g. 20 or -10"
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/[^\d-]/g, ""))}
              className={INPUT}
              aria-label="Stars to add or remove"
            />
            <div className="flex flex-wrap gap-1.5">
              {STAR_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setValue(String((valid ? delta : 0) + step))}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                    step < 0
                      ? "text-rose-600 ring-rose-200 hover:bg-rose-50"
                      : "text-emerald-600 ring-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">New total</span>
            <span
              className={`font-semibold tabular-nums ${negative ? "text-rose-600" : "text-slate-800"}`}
            >
              {total} stars
            </span>
          </div>
          {negative && <p className="-mt-2 text-xs text-rose-600">Stars can't go below 0.</p>}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || negative || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Thumbnail of the chosen coloring page next to the picker; a dashed blank card for free choice. */
function PagePreview({ pageId }: { pageId: string }) {
  const page = findColoringPage(pageId);
  if (!page)
    return (
      <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white text-center text-[11px] font-semibold text-slate-400">
        Blank
        <br />
        canvas
      </div>
    );
  return (
    <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <img
        key={page.id}
        src={coloringPageThumbToSrc(page)}
        alt={page.name}
        className="h-full w-full object-contain p-1.5"
        draggable={false}
      />
      {page.premium && (
        <span className="absolute left-1 top-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
          ⭐ Premium
        </span>
      )}
    </div>
  );
}

/** Grey placeholder block shown while data loads. */
function Bone({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`block animate-pulse rounded bg-slate-200/80 ${className}`} />
  );
}

function EntryGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading entries"
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4"
    >
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Bone className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Bone className="h-3.5 w-32" />
            <Bone className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function JudgingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <Bone className="h-5 w-52" />
        <Bone className="h-3.5 w-72" />
      </div>
      <EntryGridSkeleton />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200";
const BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60";
