"use client";

import React from "react";
import type { AppStateV1, TaskKind } from "@/types/task";
import { AddTaskRow } from "@/components/AddTaskRow";
import { DailyList } from "@/components/DailyList";
import { WeeklyList } from "@/components/WeeklyList";
import { DAY_ROLLOVER_CHECK_MS } from "@/lib/constants";
import { getTodayKey, getWeekKey, clampMin0 } from "@/lib/time";
import { createTask, exportStateJson, importStateJson, loadState, saveState } from "@/lib/storage";

export default function HomePage() {
  const [state, setState] = React.useState<AppStateV1 | null>(null);
  const [ioOpen, setIoOpen] = React.useState(false);
  const [ioText, setIoText] = React.useState("");

  // initial load
  React.useEffect(() => {
    setState(loadState());
  }, []);

  // day/week rollover while app is open
  React.useEffect(() => {
    if (!state) return;
    const t = window.setInterval(() => {
      const nowToday = getTodayKey();
      const nowWeek = getWeekKey();
      setState((prev) => {
        if (!prev) return prev;
        let next = prev;

        if (prev.todayKey !== nowToday) {
          next = { ...next, todayKey: nowToday, dailyDone: {} };
        }
        if (prev.weekKey !== nowWeek) {
          next = { ...next, weekKey: nowWeek, weeklySpentMin: {} };
        }
        if (next !== prev) saveState(next);
        return next;
      });
    }, DAY_ROLLOVER_CHECK_MS);

    return () => window.clearInterval(t);
  }, [state]);

  function commit(updater: (s: AppStateV1) => AppStateV1) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }

  function onAdd(title: string, kind: TaskKind) {
    commit((s) => {
      const task = createTask(title, kind);
      const next: AppStateV1 = {
        ...s,
        tasks: [task, ...s.tasks],
      };
      if (kind === "weekly") {
        next.weeklyTargetMin = { ...next.weeklyTargetMin, [task.id]: 600 };
        next.weeklySpentMin = { ...next.weeklySpentMin, [task.id]: 0 };
      }
      return next;
    });
  }

  function onDelete(taskId: string) {
    commit((s) => {
      const tasks = s.tasks.filter((t) => t.id !== taskId);

      const { [taskId]: _d1, ...dailyDone } = s.dailyDone;
      const { [taskId]: _w1, ...weeklyTargetMin } = s.weeklyTargetMin;
      const { [taskId]: _w2, ...weeklySpentMin } = s.weeklySpentMin;

      return { ...s, tasks, dailyDone, weeklyTargetMin, weeklySpentMin };
    });
  }

  function onToggleDailyDone(taskId: string) {
    commit((s) => {
      const cur = !!s.dailyDone[taskId];
      return { ...s, dailyDone: { ...s.dailyDone, [taskId]: !cur } };
    });
  }

  function onAddWeeklyMin(taskId: string, deltaMin: number) {
    commit((s) => {
      const cur = clampMin0(s.weeklySpentMin[taskId] ?? 0);
      const nextVal = clampMin0(cur + deltaMin);
      return { ...s, weeklySpentMin: { ...s.weeklySpentMin, [taskId]: nextVal } };
    });
  }

  function onSetWeeklyTargetMin(taskId: string, targetMin: number) {
    commit((s) => {
      const nextVal = clampMin0(targetMin);
      return { ...s, weeklyTargetMin: { ...s.weeklyTargetMin, [taskId]: nextVal } };
    });
  }

  function openExport() {
    if (!state) return;
    setIoText(exportStateJson(state));
    setIoOpen(true);
  }

  function doImport() {
    try {
      const next = importStateJson(ioText);
      setState(next);
      setIoOpen(false);
    } catch (e: any) {
      alert(e?.message ?? "Import failed.");
    }
  }

  if (!state) {
    return <div className="p-6 text-sm text-neutral-600">Loading...</div>;
  }

  const dailyTasks = state.tasks.filter((t) => t.kind === "daily");
  const weeklyTasks = state.tasks.filter((t) => t.kind === "weekly");

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">TimeSlicer</h1>
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Daily resets: {state.todayKey} · Weekly resets: {state.weekKey}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
              onClick={openExport}
            >
              Export
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
              onClick={() => {
                setIoText("");
                setIoOpen(true);
              }}
            >
              Import
            </button>
          </div>
        </header>

        <AddTaskRow onAdd={onAdd} />

        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Daily</h2>
            <DailyList
              tasks={dailyTasks}
              dailyDone={state.dailyDone}
              onToggleDone={onToggleDailyDone}
              onDelete={onDelete}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Weekly</h2>
            <WeeklyList
              tasks={weeklyTasks}
              weeklyTargetMin={state.weeklyTargetMin}
              weeklySpentMin={state.weeklySpentMin}
              onAddMin={onAddWeeklyMin}
              onSetTargetMin={onSetWeeklyTargetMin}
              onDelete={onDelete}
            />
          </div>
        </section>

        {ioOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-xl border bg-white p-4 shadow-lg dark:bg-neutral-950">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">Export / Import JSON</div>
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => setIoOpen(false)}
                >
                  Close
                </button>
              </div>

              <textarea
                className="mt-3 h-72 w-full rounded-lg border p-3 font-mono text-xs bg-transparent"
                value={ioText}
                onChange={(e) => setIoText(e.target.value)}
                placeholder="Paste JSON here to import. Or export will appear here."
              />

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => {
                    navigator.clipboard.writeText(ioText).catch(() => {});
                  }}
                >
                  Copy
                </button>
                <button
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={doImport}
                >
                  Import (overwrite)
                </button>
              </div>

              <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
                Import overwrites current local data. Export is safe.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
