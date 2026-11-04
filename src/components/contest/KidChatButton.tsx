import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  countUnread,
  fetchThread,
  mergeMessage,
  subscribeToMessages,
  type ChatMessage,
} from "@/lib/chat";
import { playChime } from "@/lib/chime";
import { JUDGE_NAME } from "@/lib/contests";
import { usePlayerStore } from "@/lib/player";
import { friendlyError, getSupabase } from "@/lib/supabase";
import { ChatDrawer } from "./ChatDrawer";

/** Several chat buttons can be on screen (banner + gallery card): ring once per message. */
const rung = new Set<string>();

/**
 * "Chat with Captain Crayon" for the kid's own contest drawing, plus the chat drawer it opens.
 * Listens live while it's on screen: a new message from the judge rings a chime, pops a toast and
 * wiggles the button with a "new" badge.
 */
export function KidChatButton({
  submissionId,
  imageUrl,
  variant,
}: {
  submissionId: string;
  imageUrl?: string;
  /**
   * "wide": full-width button (contest page) · "pill": small pill over the home banner ·
   * "card": round icon with a count, in a gallery card's footer ·
   * "header": round white button in the editor header, next to "Send".
   */
  variant: "wide" | "pill" | "card" | "header";
}) {
  const supabase = getSupabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [ringKey, setRingKey] = useState(0); // bump → replay the wiggle

  useEffect(() => {
    if (!supabase || open) return;
    let alive = true;
    fetchThread(supabase, submissionId)
      .then((list) => alive && setMessages(list))
      .catch(() => alive && setMessages([])); // chat table not installed yet
    // The drawer has its own live feed while open; this one covers the closed state.
    const stop = subscribeToMessages(supabase, { submissionId }, (message) => {
      setMessages((current) => mergeMessage(current, message));
      if (message.sender !== "judge" || rung.has(message.id)) return;
      rung.add(message.id);
      playChime();
      setRingKey((key) => key + 1);
      toast(`💬 ${JUDGE_NAME} sent you a message!`, {
        id: `chat-${message.id}`,
        description: message.body.slice(0, 80),
        action: { label: "Open", onClick: () => setOpen(true) },
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [open, submissionId, supabase]);

  if (!supabase) return null;
  const unread = open ? 0 : countUnread(messages, "artist", submissionId);

  const badge = unread > 0 && (
    <span className="whitespace-nowrap rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white sm:px-2 sm:text-xs">
      {unread} new
    </span>
  );

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${JUDGE_NAME}${unread ? `, ${unread} new` : ""}`}
          title={`Chat with ${JUDGE_NAME}`}
          className={`relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-[0_8px_18px_-10px_rgba(80,60,160,0.7)] ring-1 transition-transform active:scale-95 sm:size-11 ${
            unread
              ? "bg-violet-600 text-white ring-violet-600"
              : "bg-white text-violet-600 ring-violet-100"
          }`}
        >
          <MessageCircle key={ringKey} className={`size-5 ${unread ? "chat-ring" : ""}`} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      ) : variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${JUDGE_NAME}: ${messages.length} messages${unread ? `, ${unread} new` : ""}`}
          title={`Chat with ${JUDGE_NAME}`}
          className={`relative flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 font-display text-xs font-semibold transition-colors ${
            unread ? "bg-violet-600 text-white" : "text-violet-600 hover:bg-violet-50"
          }`}
        >
          <MessageCircle key={ringKey} className={`size-4 ${unread ? "chat-ring" : ""}`} />
          {messages.length > 0 && <span className="tabular-nums">{messages.length}</span>}
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      ) : variant === "wide" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-display text-base font-semibold transition-colors ${
            unread
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-violet-50 text-violet-700 ring-1 ring-violet-100 hover:bg-violet-100"
          }`}
        >
          <MessageCircle key={ringKey} className={`size-5 shrink-0 ${unread ? "chat-ring" : ""}`} />
          <span className="whitespace-nowrap">
            Chat<span className="hidden min-[360px]:inline"> with {JUDGE_NAME}</span>
          </span>
          {badge}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${JUDGE_NAME}${unread ? `, ${unread} new` : ""}`}
          className={`relative inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold shadow-md ring-2 ring-white transition-transform active:scale-95 sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-sm ${
            unread ? "bg-violet-600 text-white" : "bg-white text-violet-700"
          }`}
        >
          <MessageCircle key={ringKey} className={`size-4 ${unread ? "chat-ring" : ""}`} />
          <span className="hidden min-[400px]:inline">Chat</span>
          {/* Small phones: a red number dot instead of "1 new", so the pill stays tiny. */}
          {unread > 0 && (
            <>
              <span className="hidden min-[400px]:inline">{badge}</span>
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white min-[400px]:hidden">
                {unread}
              </span>
            </>
          )}
        </button>
      )}
      <ChatDrawer
        supabase={supabase}
        submissionId={open ? submissionId : null}
        me="artist"
        artistName={usePlayerStore.getState().name ?? "Artist"}
        imageUrl={imageUrl}
        side="bottom"
        onClose={() => setOpen(false)}
        onError={(error) => friendlyError(error)}
      />
    </>
  );
}
