"use client";

import React from "react";
import type { AppStateV1, TaskKind } from "@/types/task";
import { AddTaskRow } from "@/components/AddTaskRow";
import { DailyList } from "@/components/DailyList";
import { WeeklyList } from "@/components/WeeklyList";
import { DAY_ROLLOVER_CHECK_MS } from "@/lib/constants";
import { getTodayKey, getWeekKey, clampMin0 } from "@/lib/time";
import {
  createTask,
  exportStateJson,
  importStateJson,
  loadState,
  saveState,
} from "@/lib/storage";

export default function HomePage() {
  const [state, setState] = React.useState<AppStateV1 | null>(null);

  // 현재 시각 (압박 색상 계산용)
  const [nowMs, setNowMs] = React.useState(Date.now());

  // Export / Import 모달
  const [ioOpen, setIoOpen] = React.useState(false);
  const [ioText, setIoText] = React.useState("");

  /* =========================
   * 초기 로드
   * ========================= */
  React.useEffect(() => {
    setState(loadState());
  }, []);

  /* =========================
   * 시간 갱신 (1분)
   * ========================= */
  React.useEffect(() => {
    const t = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  /* =========================
   * Day / Week rollover 감지
   * ========================= */
  React.useEffect(() => {
    if (!state) return;

    const t = window.setInterval(() => {
      const today = getTodayKey();
      const week = getWeekKey();

      setState((prev) => {
        if (!prev) return prev;

        let next = prev;
        let changed = false;

        if (prev.todayKey !== today) {
          next = {
            ...next,
            todayKey: today,
            dailyDone: {},
          };
          changed = true;
        }

        if (prev.weekKey !== week) {
          next = {
            ...next,
            weekKey: week,
            weeklySpentMin: {},
          };
          changed = true;
        }

        if (changed) saveState(next);
        return next;
      });
    }, DAY_ROLLOVER_CHECK_MS);

    return () => window.clearInterval(t);
  }, [state]);

  /* =========================
   * 공통 commit helper
   * ========================= */
  function commit(updater: (s: AppStateV1) => AppStateV1) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }

  /* =========================
   * Actions
   * ========================= */
  function onAdd(title: string, kind: TaskKind) {
    commit((s) => {
      const task = createTask(title, kind);
      const next: AppStateV1 = {
        ...s,
        tasks: [task, ...s.tasks],
      };

      if (kind === "weekly") {
        next.weeklyTargetMin = {
          ...next.weeklyTargetMin,
          [task.id]: 600,
        };
        next.weeklySpentMin = {
          ...next.weeklySpentMin,
          [task.id]: 0,
        };
      }

      return next;
    });
  }

  function onDelete(taskId: string) {
    commit((s) => {
      const tasks = s.tasks.filter((t) => t.id !== taskId);

      const { [taskId]: _, ...dailyDone } = s.dailyDone;
      const { [taskId]: __, ...weeklyTargetMin } = s.weeklyTargetMin;
      const { [taskId]: ___, ...weeklySpentMin } = s.weeklySpentMin;

      return {
        ...s,
        tasks,
        dailyDone,
        weeklyTargetMin,
        weeklySpentMin,
      };
    });
  }

  function onToggleDailyDone(taskId: string) {
    commit((s) => {
      const cur = !!s.dailyDone[taskId];
      return {
        ...s,
        dailyDone: {
          ...s.dailyDone,
          [taskId]: !cur,
        },
      };
    });
  }

  function onAddWeeklyMin(taskId: string, deltaMin: number) {
    commit((s) => {
      const cur = clampMin0(s.weeklySpentMin[taskId] ?? 0);
      const nextVal = clampMin0(cur + deltaMin);
      return {
        ...s,
        weeklySpentMin: {
          ...s.weeklySpentMin,
          [taskId]: nextVal,
        },
      };
    });
  }

  function onSetWeeklyTargetMin(taskId: string, targetMin: number) {
    commit((s) => {
      return {
        ...s,
        weeklyTargetMin: {
          ...s.weeklyTargetMin,
          [taskId]: clampMin0(targetMin),
        },
      };
    });
  }

  /* =========================
   * Export / Import
   * ========================= */
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
      alert(e?.message ?? "Import failed");
    }
  }

  /* =========================
   * Render
   * ========================= */
  if (!state) {
    return (
      <div className="p-6 text-sm text-neutral-600">
        Loading...
      </div>
    );
  }

  const dailyTasks = state.tasks.filter((t) => t.kind === "daily");
  const weeklyTasks = state.tasks.filter((t) => t.kind === "weekly");

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">TimeSlicer</h1>
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Daily reset: {state.todayKey} · Weekly reset: {state.weekKey}
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

        {/* Add Task */}
        <AddTaskRow onAdd={onAdd} />

        {/* Lists */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Daily</h2>
            <DailyList
              tasks={dailyTasks}
              dailyDone={state.dailyDone}
              onToggleDone={onToggleDailyDone}
              onDelete={onDelete}
              nowMs={nowMs}
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
              nowMs={nowMs}
            />
          </div>
        </section>

        {/* Export / Import Modal */}
        {ioOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-xl border bg-white p-4 shadow-lg dark:bg-neutral-950">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">
                  Export / Import JSON
                </div>
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
                placeholder="Exported JSON will appear here, or paste JSON to import."
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
                Import will overwrite current local data.
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
