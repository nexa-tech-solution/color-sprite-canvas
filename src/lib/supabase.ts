import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Contest features are hidden when the backend isn't configured (e.g. local dev without .env). */
export const isBackendConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "pastel-paint.auth",
      },
    });
  }
  return client;
}

export function submissionImageUrl(path: string, version?: string) {
  const supabase = getSupabase();
  if (!supabase) return "";
  const { data } = supabase.storage.from("submissions").getPublicUrl(path);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}

/** Turn Postgres `raise exception 'code'` into a friendly, kid-readable message. */
export function friendlyError(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? String(error);
  const map: Record<string, string> = {
    contest_not_started: "This contest hasn't started yet.",
    contest_ended: "This contest is already over.",
    contest_full: "Sorry, this contest is full.",
    not_enough_points: "You need more stars for this one.",
    page_not_for_sale: "This page isn't available right now.",
    not_signed_in: "Please check your internet and try again.",
    admin_only: "Only grown-up judges can do that.",
    already_published: "Results are already published.",
    slow_down: "Whoa, that's a lot of messages! Wait a minute and try again.",
    not_allowed: "You can only chat about your own drawing.",
  };
  for (const [code, text] of Object.entries(map)) {
    if (message.includes(code)) return text;
  }
  if (/fetch|network|Failed to fetch/i.test(message)) return "No internet connection. Try again.";
  return "Something went wrong. Please try again.";
}

let adminClient: SupabaseClient | null = null;

/**
 * Separate client for /admin (email login) so signing in as a judge never
 * replaces this device's anonymous player session.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (!isBackendConfigured || typeof window === "undefined") return null;
  if (!adminClient) {
    adminClient = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "pastel-paint.admin-auth",
      },
    });
  }
  return adminClient;
}
