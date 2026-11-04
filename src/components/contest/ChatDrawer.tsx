import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2, SendHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  CHAT_MAX_LENGTH,
  fetchThread,
  markSeen,
  mergeMessage,
  sendChatMessage,
  subscribeToMessages,
  type ChatMessage,
  type ChatRole,
} from "@/lib/chat";
import { JUDGE_NAME } from "@/lib/contests";

const KID_QUICK_REPLIES = ["Thank you! 😊", "👍", "❤️", "🎨"];

/**
 * Chat about one drawing, live while open. `me` decides which side the bubbles sit on;
 * the database decides who really sent each message.
 */
export function ChatDrawer({
  supabase,
  submissionId,
  me,
  artistName,
  imageUrl,
  side = "right",
  onClose,
  onError,
  onMessage,
}: {
  supabase: SupabaseClient;
  /** Open while set. */
  submissionId: string | null;
  me: ChatRole;
  artistName: string;
  /** The drawing being talked about, shown in the header. */
  imageUrl?: string;
  side?: "right" | "bottom";
  onClose: () => void;
  /** Turns a failed load/send into a message for this audience. */
  onError: (error: unknown) => string | null;
  onMessage?: (message: ChatMessage) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!submissionId) return;
    setMessages(null);
    setText("");
    setProblem("");
    let alive = true;
    fetchThread(supabase, submissionId)
      .then((list) => alive && setMessages(list))
      .catch((error) => {
        if (!alive) return;
        setMessages([]);
        setProblem(onErrorRef.current(error) ?? "");
      });
    const stop = subscribeToMessages(supabase, { submissionId }, (message) => {
      setMessages((current) => mergeMessage(current ?? [], message));
      onMessageRef.current?.(message);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [submissionId, supabase]);

  // While open, everything shown counts as read; keep the newest message in view.
  useEffect(() => {
    if (!submissionId || !messages) return;
    markSeen(me, submissionId, messages.at(-1)?.created_at);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [me, messages, submissionId]);

  const send = async (body: string) => {
    if (!submissionId || !body.trim() || sending) return;
    setSending(true);
    setProblem("");
    try {
      const message = await sendChatMessage(supabase, submissionId, body);
      setMessages((current) => mergeMessage(current ?? [], message));
      setText("");
    } catch (error) {
      setProblem(onError(error) ?? "");
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(text);
  };

  const otherName = me === "judge" ? artistName : JUDGE_NAME;
  const kid = me === "artist";

  return (
    <Sheet open={Boolean(submissionId)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={side}
        onOpenAutoFocus={(event) => kid && event.preventDefault()}
        className={`flex flex-col gap-0 bg-white p-0 ${
          side === "bottom"
            ? "h-[85dvh] rounded-t-2xl sm:mx-auto sm:max-w-lg"
            : "w-full sm:max-w-md"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 pr-12">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="The drawing"
              onError={(event) => (event.currentTarget.style.visibility = "hidden")}
              className="size-12 shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">
              {kid ? "🖍️" : "🎨"}
            </span>
          )}
          <div className="min-w-0">
            <SheetTitle
              className={`truncate font-semibold text-slate-800 ${kid ? "font-display text-lg" : "text-base"}`}
            >
              {kid ? `Chat with ${JUDGE_NAME}` : `Chat with ${artistName}`}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              {kid ? "About your contest drawing" : "Only you and this artist see these messages"}
            </SheetDescription>
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4">
          {messages === null ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-violet-500" />
            </div>
          ) : messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-400">
              {kid
                ? `No messages yet. Say hi to ${JUDGE_NAME}! 👋`
                : `No messages yet. Say something nice about ${artistName}'s drawing.`}
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender === me;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}
                  >
                    {!mine && (
                      <span className="mb-0.5 px-1 text-[11px] font-semibold text-slate-400">
                        {otherName}
                      </span>
                    )}
                    <p
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 ${
                        kid ? "text-[15px]" : "text-sm"
                      } ${
                        mine
                          ? "rounded-br-md bg-violet-600 text-white"
                          : "rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      {message.body}
                    </p>
                    <span className="mt-0.5 px-1 text-[10px] text-slate-400">
                      {new Date(message.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3">
          {problem && <p className="mb-2 px-1 text-xs font-semibold text-rose-600">{problem}</p>}
          {kid && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto">
              {KID_QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  disabled={sending}
                  onClick={() => void send(reply)}
                  className="shrink-0 cursor-pointer rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 ring-1 ring-violet-100 hover:bg-violet-100 disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send(text);
                }
              }}
              maxLength={CHAT_MAX_LENGTH}
              rows={1}
              placeholder={kid ? "Write a message…" : `Message ${artistName}…`}
              aria-label="Message"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send message"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {sending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <SendHorizontal className="size-5" />
              )}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
