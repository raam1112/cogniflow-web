import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function getUserClient(token: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const supabase = getUserClient(token);
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return new Response("Unauthorized", { status: 401 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const tools = {
          list_tasks: tool({
            description: "List the user's tasks, optionally filtered by status.",
            inputSchema: z.object({
              status: z.enum(["todo", "in_progress", "done"]).optional(),
            }),
            execute: async ({ status }) => {
              let q = supabase.from("tasks").select("id,title,priority,status,due_date,category");
              if (status) q = q.eq("status", status);
              const { data, error } = await q.order("created_at", { ascending: false });
              if (error) return { error: error.message };
              return { tasks: data };
            },
          }),
          create_task: tool({
            description: "Create a new task for the user.",
            inputSchema: z.object({
              title: z.string().min(1),
              description: z.string().optional(),
              category: z.string().optional(),
              priority: z.enum(["low", "medium", "high"]).default("medium"),
              due_date: z.string().optional().describe("ISO 8601 datetime"),
            }),
            execute: async (input) => {
              const { data, error } = await supabase
                .from("tasks")
                .insert({ ...input, user_id: uid })
                .select("id,title")
                .single();
              if (error) return { error: error.message };
              return { created: data };
            },
          }),
          complete_task: tool({
            description: "Mark a task as done by its id.",
            inputSchema: z.object({ id: z.string() }),
            execute: async ({ id }) => {
              const { error } = await supabase
                .from("tasks")
                .update({ status: "done", completed_at: new Date().toISOString() })
                .eq("id", id);
              if (error) return { error: error.message };
              return { ok: true };
            },
          }),
        };

        const result = streamText({
          model,
          system:
            "You are CogniFlow's assistant, an expert productivity coach embedded in a brutalist task manager. " +
            "Help the user organize, prioritize, and act on their tasks. Use the tools to read and modify their tasks. " +
            "Be concise and direct. When you create or complete tasks, confirm what you did.",
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(10),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
