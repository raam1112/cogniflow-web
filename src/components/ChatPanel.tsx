import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ChatPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, options) => {
        const { data } = await supabase.auth.getSession();
        const headers = new Headers(options?.headers);
        if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
        return fetch(url, { ...options, headers });
      },
    }),
    onError: (e) => toast.error(e.message || "Assistant error"),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l-2 border-border p-0 sm:max-w-md">
        <SheetHeader className="border-b-2 border-border p-4">
          <SheetTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center bg-brand text-brand-foreground">
              <Bot className="h-4 w-4" />
            </span>
            Task Assistant
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Ask me to organize your tasks.</p>
                <p className="mt-2">"What's overdue?" · "Create a task to call the bank tomorrow" · "Mark groceries as done"</p>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const toolParts = m.parts.filter((p) => p.type.startsWith("tool-"));
              return (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[95%] text-sm text-foreground"
                    }
                  >
                    {toolParts.length > 0 && (
                      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Wrench className="h-3 w-3" /> acting on your tasks…
                      </div>
                    )}
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    ) : (
                      text
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={submit} className="flex gap-2 border-t-2 border-border p-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant…"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="btn-brutal" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
