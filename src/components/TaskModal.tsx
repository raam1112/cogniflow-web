import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Trash2 } from "lucide-react";
import type { Task, TaskInput, TaskPriority, TaskStatus } from "@/lib/tasks";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  onSave: (input: TaskInput, newSubtasks: string[]) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export function TaskModal({ open, onOpenChange, task, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subInput, setSubInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setCategory(task?.category ?? "");
      setPriority(task?.priority ?? "medium");
      setStatus(task?.status ?? "todo");
      setDueDate(task?.due_date ? task.due_date.slice(0, 16) : "");
      setSubtasks([]);
      setSubInput("");
    }
  }, [open, task]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          priority,
          status,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        },
        subtasks,
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-border">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            {task ? "Edit task" : "New task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-cat">Category</Label>
              <Input id="t-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Work" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Due date</Label>
              <Input id="t-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!task && (
            <div className="space-y-1.5">
              <Label>Subtasks</Label>
              <div className="flex gap-2">
                <Input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  placeholder="Add a checklist item"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (subInput.trim()) {
                        setSubtasks([...subtasks, subInput.trim()]);
                        setSubInput("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (subInput.trim()) {
                      setSubtasks([...subtasks, subInput.trim()]);
                      setSubInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {subtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {subtasks.map((s, i) => (
                    <li key={i} className="flex items-center justify-between bg-muted px-2 py-1 text-sm">
                      <span>{s}</span>
                      <button type="button" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {task && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await onDelete(task.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            ) : <span />}
            <Button type="submit" disabled={saving} className="font-display font-bold uppercase btn-brutal">
              {task ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
