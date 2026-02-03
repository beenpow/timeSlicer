"use client";

import React from "react";
import type { AppStateV1, Task } from "@/types/task";
import { AddTaskRow } from "@/components/AddTaskRow";
import { DailyList } from "@/components/DailyList";
import { WeeklyList } from "@/components/WeeklyList";
import { loadStateSmart, saveStateSmart, loadState } from "@/lib/storage";
import { getClientId } from "@/lib/client_id";
import { getTodayKey, getWeekKey } from "@/lib/time";
import { DEFAULT_WEEKLY_TARGET_MIN } from "@/lib/constants";

function makeEmptyState(): AppStateV1 {
  const todayKey = getTodayKey();
  const weekKey = getWeekKey();
  return {
    version: 1,
    tasks: [],
    todayKey,
    dailyDone: {},
    weekKey,
    weeklyTargetMin: {},
    weeklySpentMin: {},
  };
}

export default function Page() {
  const [state, setState] = React.useState<AppStateV1 | null>(null);
  const clientId = React.useMemo(() => getClientId(), []);
  const didHydrateRef = React.useRef(false);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function commit(updater: (s: AppStateV1) => AppStateV1) {
    setState((prev) => {
      if (!prev) return prev;

      const next = updater(prev);

      if (next === prev) return prev;

      if (didHydrateRef.current) {
        saveStateSmart(next);
      }
      return next;
    });
  }

  function runRolloverCheck() {
    commit((prev) => {
      const today = getTodayKey();
      const week = getWeekKey();

      let next = prev;
      let changed = false;

      if (prev.todayKey !== today) {
        next = { ...next, todayKey: today, dailyDone: {} };
        changed = true;
      }
      if (prev.weekKey !== week) {
        next = { ...next, weekKey: week, weeklySpentMin: {} };
        changed = true;
      }

      return changed ? next : prev;
    });
  }

  React.useEffect(() => {
    (async () => {
      const local = loadState();
      try {
        const s = await loadStateSmart();
        const finalState = (s ?? local ?? makeEmptyState()) as AppStateV1;
        setState(finalState);
        didHydrateRef.current = true;
        setTimeout(() => runRolloverCheck(), 0);
      } catch {
        const fallback = local ?? makeEmptyState();
        setState(fallback);
        didHydrateRef.current = true;
        setTimeout(() => runRolloverCheck(), 0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const onFocus = () => runRolloverCheck();
    const onVis = () => {
      if (document.visibilityState === "visible") runRolloverCheck();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  const dailyTasks = state.tasks.filter((t) => t.kind === "daily");
  const weeklyTasks = state.tasks.filter((t) => t.kind === "weekly");

  function addTask(title: string, kind: Task["kind"]) {
    const trimmed = title.trim();
    if (!trimmed) return;

    commit((prev) => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: trimmed,
        kind,
        createdAt: Date.now(),
      };

      let next: AppStateV1 = { ...prev, tasks: [...prev.tasks, task] };

      if (kind === "weekly") {
        next = {
          ...next,
          weeklyTargetMin: {
            ...next.weeklyTargetMin,
            [task.id]: DEFAULT_WEEKLY_TARGET_MIN,
          },
        };
      }

      return next;
    });
  }

  function deleteTask(taskId: string) {
    commit((prev) => {
      const tasks = prev.tasks.filter((t) => t.id !== taskId);
      const { [taskId]: _a, ...weeklyTargetMin } = prev.weeklyTargetMin;
      const { [taskId]: _b, ...weeklySpentMin } = prev.weeklySpentMin;
      const { [taskId]: _c, ...dailyDone } = prev.dailyDone;
      return { ...prev, tasks, weeklyTargetMin, weeklySpentMin, dailyDone };
    });
  }

  function toggleDailyDone(taskId: string) {
    commit((prev) => {
      const done = !!prev.dailyDone[taskId];
      return {
        ...prev,
        dailyDone: { ...prev.dailyDone, [taskId]: !done },
      };
    });
  }

  function addWeeklyMinutes(taskId: string, deltaMin: number) {
    commit((prev) => {
      const cur = prev.weeklySpentMin[taskId] ?? 0;
      const nextSpent = Math.max(0, cur + deltaMin);
      return {
        ...prev,
        weeklySpentMin: { ...prev.weeklySpentMin, [taskId]: nextSpent },
      };
    });
  }

  function setWeeklyTarget(taskId: string, targetMin: number) {
    commit((prev) => ({
      ...prev,
      weeklyTargetMin: { ...prev.weeklyTargetMin, [taskId]: Math.max(0, targetMin) },
    }));
  }

  // ✅ NEW: rename task title
  function renameTask(taskId: string, nextTitle: string) {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;

    commit((prev) => {
      const idx = prev.tasks.findIndex((t) => t.id === taskId);
      if (idx < 0) return prev;

      const cur = prev.tasks[idx];
      if (cur.title === trimmed) return prev;

      const tasks = prev.tasks.slice();
      tasks[idx] = { ...cur, title: trimmed };
      return { ...prev, tasks };
    });
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Time Slicer</h1>
        <div className="text-xs opacity-60">
          clientId: <span className="font-mono">{clientId}</span>
        </div>
        <div className="text-xs opacity-60">
          todayKey: <span className="font-mono">{state.todayKey}</span> / weekKey:{" "}
          <span className="font-mono">{state.weekKey}</span>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Add task</h2>
        <AddTaskRow onAdd={addTask} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Daily</h2>
        <DailyList
          tasks={dailyTasks}
          dailyDone={state.dailyDone}
          onToggleDone={toggleDailyDone}
          onDelete={deleteTask}
          onRenameTask={renameTask}
          nowMs={nowMs}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Weekly</h2>
        <WeeklyList
          tasks={weeklyTasks}
          weeklyTargetMin={state.weeklyTargetMin}
          weeklySpentMin={state.weeklySpentMin}
          onAddMin={addWeeklyMinutes}
          onSetTargetMin={setWeeklyTarget}
          onDelete={deleteTask}
          onRenameTask={renameTask}
          nowMs={nowMs}
        />
      </section>
    </main>
  );
}
