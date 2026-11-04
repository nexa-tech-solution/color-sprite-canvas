import type { SupabaseClient } from "@supabase/supabase-js";

/** One message in a drawing's chat (migration 0008). */
export interface ChatMessage {
  id: string;
  submission_id: string;
  contest_id: string;
  sender: ChatRole;
  body: string;
  created_at: string;
}

export type ChatRole = "judge" | "artist";

export const CHAT_MAX_LENGTH = 500;
const COLUMNS = "id, submission_id, contest_id, sender, body, created_at";

export async function fetchThread(supabase: SupabaseClient, submissionId: string) {
  const { data, error } = await supabase
    .from("submission_messages")
    .select(COLUMNS)
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

/** Every message of a contest, for the unread badges in /admin. */
export async function fetchContestMessages(supabase: SupabaseClient, contestId: string) {
  const { data, error } = await supabase
    .from("submission_messages")
    .select(COLUMNS)
    .eq("contest_id", contestId)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

/** The database fills in who is sending (judge or artist) and the time. */
export async function sendChatMessage(
  supabase: SupabaseClient,
  submissionId: string,
  body: string,
) {
  const { data, error } = await supabase
    .from("submission_messages")
    .insert({ submission_id: submissionId, body: body.trim() })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/** Live new messages (Supabase Realtime over a WebSocket). Returns the unsubscribe function. */
export function subscribeToMessages(
  supabase: SupabaseClient,
  filter: { submissionId: string } | { contestId: string },
  onMessage: (message: ChatMessage) => void,
) {
  const [column, value] =
    "submissionId" in filter
      ? ["submission_id", filter.submissionId]
      : ["contest_id", filter.contestId];
  const channel = supabase
    .channel(`chat-${column}-${value}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "submission_messages",
        filter: `${column}=eq.${value}`,
      },
      (payload) => onMessage(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Add a message unless it's already there (the sender gets it back from insert and Realtime). */
export function mergeMessage(list: ChatMessage[], message: ChatMessage) {
  return list.some((item) => item.id === message.id) ? list : [...list, message];
}

// ── Unread: remembered per device, per role, per drawing ──

const seenKey = (role: ChatRole, submissionId: string) => `chat-seen:${role}:${submissionId}`;

export function getLastSeen(role: ChatRole, submissionId: string) {
  try {
    return localStorage.getItem(seenKey(role, submissionId)) ?? "";
  } catch {
    return "";
  }
}

export function markSeen(role: ChatRole, submissionId: string, at = new Date().toISOString()) {
  try {
    localStorage.setItem(seenKey(role, submissionId), at);
  } catch {
    // Private mode etc.: badges just reappear next time.
  }
}

/** Messages from the other side that arrived after this device last opened the chat. */
export function countUnread(messages: ChatMessage[], me: ChatRole, submissionId: string) {
  const seen = getLastSeen(me, submissionId);
  return messages.filter(
    (message) =>
      message.submission_id === submissionId && message.sender !== me && message.created_at > seen,
  ).length;
}
