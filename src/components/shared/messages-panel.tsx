"use client";

import { useMutation, useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface MessagesPanelProps {
  /** When true, renders inside an existing card without its own card chrome. */
  embedded?: boolean;
}

export function MessagesPanel({ embedded = false }: MessagesPanelProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads = useQuery(api.threads.listMine, userId ? { userId } : "skip");
  const active = useQuery(
    api.threads.get,
    userId && activeId ? { userId, threadId: activeId } : "skip"
  );
  const sendMessage = useMutation(api.threads.sendMessage);
  const markRead = useMutation(api.threads.markRead);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length]);

  // Mark thread as read when opened
  useEffect(() => {
    if (activeId && userId && active?.messages?.some((m: any) => !m.read && m.senderId !== userId)) {
      markRead({ userId, threadId: activeId }).catch(() => {});
    }
  }, [activeId, userId, active?.messages?.length]);

  async function send() {
    if (!userId || !activeId || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage({ userId, threadId: activeId, body: draft.trim() });
      setDraft("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!session) {
    return (
      <Card className={cn("p-10 text-center", embedded && "border-0 shadow-none")}>
        <p className="text-muted-foreground">Log in to view your messages.</p>
      </Card>
    );
  }

  if ((threads?.length ?? 0) === 0 && threads !== undefined) {
    return (
      <Card className={cn("p-10 text-center", embedded && "border-0 shadow-none")}>
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-semibold">No messages yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          When you send enquiries to vendors, your conversations will appear here.
        </p>
      </Card>
    );
  }

  const threadList = (threads ?? []).map((t: any) => {
    const otherName =
      String(t.customerId) === String(userId)
        ? t.vendor?.businessName ?? "Vendor"
        : t.customer?.name ?? "Customer";
    const preview = t.lastMessage?.body ?? "Start a conversation";
    return { ...t, otherName, preview };
  });

  const activeThread = threadList.find((t: any) => t.id === activeId);

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-3 h-[560px]">
      {/* Thread list */}
      <Card className={cn("p-0 overflow-hidden flex flex-col", activeId && "hidden md:flex", embedded && "border-0 shadow-none")}>
        <div className="p-3 border-b border-border/60">
          <p className="font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Inbox
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area-custom">
          {threads === undefined ? (
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            threadList.map((t: any) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full text-left p-3 border-b border-border/40 hover:bg-accent/50 transition flex gap-2.5",
                  activeId === t.id && "bg-accent"
                )}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {t.otherName?.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{t.otherName}</p>
                    {t.unread > 0 && (
                      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.preview}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Active conversation */}
      <Card className={cn("p-0 overflow-hidden flex flex-col", !activeId && "hidden md:flex", embedded && "border-0 shadow-none")}>
        {activeId ? (
          <>
            <div className="p-3 border-b border-border/60 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setActiveId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="font-semibold text-sm">{activeThread?.otherName}</p>
                <p className="text-xs text-muted-foreground">Conversation</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scroll-area-custom p-4 space-y-2 bg-muted/30">
              {active === undefined ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-2/3 rounded-lg" />
                  ))}
                </div>
              ) : (
                (active?.messages ?? []).map((m: any) => {
                  const mine = String(m.senderId) === String(userId);
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border rounded-bl-sm"
                        )}
                      >
                        <p>{m.body}</p>
                        <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-border/60 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="h-10"
              />
              <Button onClick={send} disabled={sending || !draft.trim()} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}