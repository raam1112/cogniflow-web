import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Search, Sun, Moon, LogOut, Bot, AlertTriangle,
  Clock, CircleCheck, ListTodo, Square, Bell, X,
} from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchTasks, createTask, updateTask, deleteTask, toggleTaskDone, toggleSubtask,
  isOverdue, isDueSoon, type Task, type TaskInput,
} from "@/lib/tasks";
import { TaskModal } from "@/components/TaskModal";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — TaskCore" }] }),
  component: Dashboard,
});

const priorityBar: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-brand",
  low: "bg-muted-foreground",
};

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border-2 border-border p-4 ${accent ? "bg-brand text-brand-foreground" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest opacity-70">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("tc_dismissed") || "[]"); } catch { return []; }
  });
  const [remOpen, setRemOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter(isOverdue).length;
    const active = tasks.filter((t) => t.status !== "done").length;
    const rate = total ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, active, rate };
  }, [tasks]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      const c = t.category || "Uncategorized";
      const e = map.get(c) ?? { total: 0, done: 0 };
      e.total++;
      if (t.status === "done") e.done++;
      map.set(c, e);
    }
    return [...map.entries()];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (search && !`${t.title} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, search]);

  const reminders = useMemo(() => {
    const list = tasks.filter((t) => t.status !== "done" && (isOverdue(t) || isDueSoon(t)) && !dismissed.includes(t.id));
    return list.sort((a, b) => {
      const aOver = isOverdue(a) ? 0 : 1;
      const bOver = isOverdue(b) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
    });
  }, [tasks, dismissed]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("tc_dismissed", JSON.stringify(next));
  };

  const handleSave = async (input: TaskInput, subtasks: string[]) => {
    try {
      if (editing) await updateTask(editing.id, input);
      else await createTask(input, subtasks);
      toast.success(editing ? "Task updated" : "Task created");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success("Task deleted");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-brand text-brand-foreground">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TASKCORE</span>
            <Badge variant="outline" className="ml-2 hidden border-brand text-brand sm:inline-flex">System Active</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setChatOpen(true)} title="AI Assistant">
              <Bot className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">System Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.overdue > 0
                ? `${stats.overdue} task${stats.overdue > 1 ? "s" : ""} overdue — act now.`
                : stats.active > 0
                  ? `${stats.active} active task${stats.active > 1 ? "s" : ""} in your stream.`
                  : "All clear. Add a task to begin."}
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="font-display font-bold uppercase btn-brutal">
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<CircleCheck className="h-4 w-4" />} label="Completion" value={`${stats.rate}%`} accent />
          <StatCard icon={<ListTodo className="h-4 w-4" />} label="Active" value={String(stats.active)} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Overdue" value={String(stats.overdue)} />
          <StatCard icon={<CircleCheck className="h-4 w-4" />} label="Completed" value={String(stats.done)} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Stream */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-8" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Active Stream</h2>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No tasks match. Create one to get started.
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((t) => {
                  const overdue = isOverdue(t);
                  const dueSoon = isDueSoon(t);
                  const subDone = t.subtasks?.filter((s) => s.is_done).length ?? 0;
                  const subTotal = t.subtasks?.length ?? 0;
                  return (
                    <li key={t.id} className="flex gap-3 border-2 border-border bg-card p-3">
                      <div className={`w-1.5 shrink-0 ${priorityBar[t.priority]}`} />
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={async () => {
                          await toggleTaskDone(t);
                          invalidate();
                        }}
                        className="mt-1"
                      />
                      <button
                        className="flex-1 text-left"
                        onClick={() => { setEditing(t); setModalOpen(true); }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                            {t.title}
                          </span>
                          {t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}
                          {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                          {dueSoon && <Badge className="bg-brand text-brand-foreground text-xs">Due soon</Badge>}
                        </div>
                        {t.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{t.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {t.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(t.due_date), "MMM d, HH:mm")}
                            </span>
                          )}
                          {subTotal > 0 && <span>{subDone}/{subTotal} subtasks</span>}
                          <span className="uppercase tracking-wide">{t.priority}</span>
                        </div>
                        {subTotal > 0 && (
                          <ul className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            {t.subtasks!.map((s) => (
                              <li key={s.id} className="flex items-center gap-2 text-sm">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await toggleSubtask(s.id, !s.is_done);
                                    invalidate();
                                  }}
                                >
                                  {s.is_done ? <CheckSquare className="h-3.5 w-3.5 text-brand" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                                <span className={s.is_done ? "text-muted-foreground line-through" : ""}>{s.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            <div className="border-2 border-border bg-card p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Progress Matrix</h2>
              <div className="mb-4">
                <div className="flex justify-between text-sm"><span>Overall</span><span className="font-bold">{stats.rate}%</span></div>
                <Progress value={stats.rate} className="mt-1.5 h-2" />
              </div>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map(([cat, e]) => {
                    const pct = e.total ? Math.round((e.done / e.total) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm"><span>{cat}</span><span className="text-muted-foreground">{e.done}/{e.total}</span></div>
                        <Progress value={pct} className="mt-1 h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-2 border-border bg-brand p-4 text-brand-foreground btn-brutal">
              <Bot className="h-6 w-6" />
              <h3 className="mt-2 font-display text-lg font-bold">Need a hand?</h3>
              <p className="mt-1 text-sm opacity-80">Ask the AI assistant to plan, create, or prioritize your tasks.</p>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setChatOpen(true)}>Open Assistant</Button>
            </div>
          </aside>
        </div>
      </main>

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <ChatPanel open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
