# Time Slicer

A small time-management app: **daily** check-off tasks and **weekly** tasks with target minutes and a visual summary of how the week is allocated.

**Live:** [https://timeslicer-rose.vercel.app/](https://timeslicer-rose.vercel.app/)

## Features

- **Daily** — Tasks you mark done/undo per day. Resets each day (date key is LA timezone).
- **Weekly** — Tasks with a target time (minutes). Log time with +15m / +30m / +60m; progress bars and a **summary bar chart** show allocation and progress at a glance.
- Inline edit for task titles. State syncs to a backend when configured.

## Tech

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**
- Client state with optional server persistence via env-configured API

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: set `NEXT_PUBLIC_TIMESLICER_API_BASE` (and `NEXT_PUBLIC_TIMESLICER_TOKEN` if required) for load/save; without them the app runs with in-memory state only.

## Build

```bash
npm run build
npm start
```
