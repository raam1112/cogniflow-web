# Smart Task Manager — Build Plan

A full-stack task manager built on this platform's stack (React + TanStack Start + Lovable Cloud), styled in the chosen **Brutalist productivity hub** direction (dark surface, lime-green `#A3FF12` accent, Space Grotesk + Inter, sharp-cornered cards with thick offset borders), now with **light/dark theming**, an **integrated AI assistant**, and supporting productivity features.

## What gets built

### 1. Backend (Lovable Cloud)
- Enable Lovable Cloud (managed Postgres, auth, storage).
- `profiles` table: `id` (FK to auth user), `display_name`, `avatar_url`, `theme_preference`, timestamps. Auto-created on signup via trigger; RLS so users read/update only their own.
- `tasks` table: `id`, `user_id`, `title`, `description`, `category`, `priority` (low/medium/high), `status` (todo/in_progress/done), `due_date`, `completed_at`, timestamps. RLS scoped to `auth.uid()`. Proper GRANTs.
- `subtasks` table: checklist items linked to a task (extra feature).
- `chat_messages` table: per-user assistant conversation history (role, content, timestamps), RLS-scoped.
- `reminder_log` table to track which deadline emails were already sent.

### 2. Authentication
- Email/password signup & login, plus Google sign-in (via the Lovable broker).
- `/auth` page (sign in / sign up) and a `/reset-password` page for recovery.
- Protected app routes under `_authenticated/`; unauthenticated users redirect to `/auth`.

### 3. Light/Dark theming
- Theme tokens for both dark (default, matching the chosen direction) and a light variant in `src/styles.css`.
- Theme toggle in the top nav; preference persisted to the profile and to localStorage, applied on load (no flash).

### 4. Task management UI (the dashboard)
Built to match the selected design composition:
- **Top nav**: app name, nav links, "System Active" pill, theme toggle, user avatar/menu with sign-out.
- **Header**: "System Overview" title + dynamic deadline summary, and a **New Task** button (brutalist offset-border style).
- **Stats grid (4 cards)**: completion %, Active tasks, Overdue, Completed — computed from real data.
- **Active Stream (main column)**: real task list with priority color bar (red = critical/overdue, lime = due soon, gray = routine), checkbox to toggle done, deadline display, category, subtask progress. Includes **search/filter**.
- **Side panel**: Progress Matrix (completion by category) + daily summary + decorative panel.
- **Add/Edit task** modal: title, description, category, priority, status, due date (date picker), subtasks. Create, update, delete with confirm.
- **Search & filter**: text search plus filter by status/priority/category.
- Responsive across desktop, tablet, mobile.

### 5. Integrated AI assistant (chatbot)
- A dockable chat panel (powered by Lovable AI) where users converse with a task-aware assistant.
- Streaming responses via a TanStack server route; conversation persisted in `chat_messages`.
- Tool-calling so the assistant can act on the user's own tasks: create tasks, list/summarize, mark done, and suggest prioritization — all scoped to the authenticated user via RLS.
- Styled to match the brutalist theme; renders markdown.

### 6. Extra features that fit
- **Subtasks / checklists** per task with progress contribution.
- **Categories/tags** management used by filters and the Progress Matrix.
- **Productivity stats**: completion rate and per-category progress (already surfaced in side panel/stats).
- **Quick search & keyboard-friendly add**.

### 7. Deadline reminders
- **In-app**: due-soon and overdue tasks visually highlighted and surfaced in stats + header summary.
- **Email**: email infrastructure setup; a scheduled job checks tasks due soon / overdue and sends a branded reminder email per task (deduped via `reminder_log`). In-app reminders work immediately; emails start once DNS verifies.

### 8. Design system
- Port the chosen direction's tokens verbatim into `src/styles.css` (`--color-surface #0F0F11`, `--color-card #18181B`, `--color-border #27272A`, `--color-brand #A3FF12`; Space Grotesk + Inter) plus a light theme variant. Sharp corners, thick/offset borders, uppercase tracked labels.
- Generate the avatar and decorative "context map" images from the prototype, plus an assistant identity mark.

## Technical notes
- Data access via `createServerFn` with `requireSupabaseAuth`; reads cached via TanStack Query.
- Chat uses Lovable AI Gateway + AI SDK with tool-calling on a `/api/chat` server route; key stays server-side.
- Email sending uses a server route + scheduled job; domain setup prompted during build.
- Google sign-in goes through the Lovable broker, configured in the same step.

## Build order
1. Enable Cloud + schema (profiles, tasks, subtasks, chat_messages, reminder_log) with RLS/GRANTs.
2. Apply design tokens + fonts + light/dark theming; generate images.
3. Auth pages + protected gate + Google sign-in.
4. Dashboard UI with stats, task list, search/filter.
5. Add/edit/delete task modal + subtasks wired to the database.
6. In-app reminder highlighting.
7. Integrated AI assistant (chat UI + server route + task tools + persistence).
8. Email infrastructure + scheduled deadline-reminder job.
