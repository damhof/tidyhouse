# 🏡 TidyHouse

A self-hosted household management app for two-person households. Track chores, to-do's, and home projects in one beautiful PWA.

## Features

### 🧹 Chores (Sweepy-style)
- Rooms with cleanliness scores computed from chore staleness
- Color-coded urgency (green → yellow → orange → red)
- Smart "What should I do?" suggestion
- Fair distribution tracker (who did what)
- Single-tap completion

### ✅ To-Do's
- One-off tasks with due dates and assignees
- Project linking with badges
- Filter by status, assignee

### 📋 Projects (Kanban)
- Kanban board: Backlog → Active → Waiting → Done
- Task checklists, notes (markdown), activity log
- Tags and priority levels

### 🎨 UI
- Material Design 3 inspired with teal accent
- Light/dark mode (system detection + manual toggle)
- Mobile-first responsive (bottom nav / side rail)
- PWA with offline support

## Tech Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **SQLite** via better-sqlite3 + Drizzle ORM
- **Tailwind CSS v4**
- **TypeScript**

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd tidyhouse-v3
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000, pick your user, and start cleaning!

The database is auto-created and seeded on first run at `./data/tidyhouse.db`.

## Docker

```bash
docker compose up -d
```

Data persists in a Docker volume. Access at http://localhost:3000.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `./data/tidyhouse.db` | Path to SQLite database |
| `NODE_ENV` | `development` | Environment mode |

## Project Structure

```
src/
├── app/               # Next.js App Router pages
│   ├── chores/        # Room list + room detail
│   ├── todos/         # To-do list
│   ├── projects/      # Project kanban + detail
│   └── history/       # Completion history
├── components/        # React components
├── db/                # Database schema, init, seed
└── lib/               # Server actions, auth, chore logic
```

## Users

Two pre-seeded users: **User 1** (👨) and **User 2** (👩). Switch via the avatar button in the header. User selection is stored in a cookie.
