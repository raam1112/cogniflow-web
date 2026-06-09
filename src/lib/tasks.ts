import { supabase } from "@/integrations/supabase/client";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export type Subtask = {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
};

export type TaskInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
};

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...t,
    subtasks: (t.subtasks ?? []).sort((a: Subtask, b: Subtask) => a.position - b.position),
  })) as Task[];
}

export async function createTask(input: TaskInput, subtasks: string[] = []) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;

  if (subtasks.length) {
    const rows = subtasks.map((title, i) => ({ task_id: data.id, user_id: uid, title, position: i }));
    const { error: subErr } = await supabase.from("subtasks").insert(rows);
    if (subErr) throw subErr;
  }
  return data;
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const patch: Partial<Task> = { ...input };
  if (input.status === "done") patch.completed_at = new Date().toISOString();
  if (input.status && input.status !== "done") patch.completed_at = null;
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleTaskDone(task: Task) {
  const done = task.status === "done";
  const { error } = await supabase
    .from("tasks")
    .update({ status: done ? "todo" : "done", completed_at: done ? null : new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
}

export async function toggleSubtask(id: string, isDone: boolean) {
  const { error } = await supabase.from("subtasks").update({ is_done: isDone }).eq("id", id);
  if (error) throw error;
}

export function isOverdue(task: Task) {
  return !!task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
}

export function isDueSoon(task: Task) {
  if (!task.due_date || task.status === "done") return false;
  const due = new Date(task.due_date).getTime();
  const now = Date.now();
  return due >= now && due - now < 1000 * 60 * 60 * 24;
}
