"use client";

import React from "react";
import type { AppStateV1, Task } from "@/types/task";
import { AddTaskRow } from "@/components/AddTaskRow";
import { DailyList } from "@/components/DailyList";
import { WeeklyList } from "@/components/WeeklyList";
import { loadStateSmart, saveStateSmart, isSaveInProgress } from "@/lib/storage";
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

const RELOAD_DEBOUNCE_MS = 2500; // commit 직후 이 시간 동안은 서버 reload로 덮어쓰지 않음

export default function Page() {
  const [state, setState] = React.useState<AppStateV1 | null>(null);
  const clientId = React.useMemo(() => getClientId(), []);
  const didHydrateRef = React.useRef(false);
  const lastCommitTimeRef = React.useRef(0);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // --- 핵심: 초기 로드(loadStateSmart) 완료 전에는 절대 서버 PUT 금지
  function commit(updater: (s: AppStateV1) => AppStateV1) {
    setState((prev) => {
      if (!prev) return prev;

      const next = updater(prev);

      // 변경 없으면 저장하지 않음
      if (next === prev) return prev;

      lastCommitTimeRef.current = Date.now();

      // 서버 저장은 hydrate 이후에만
      if (didHydrateRef.current) {
        saveStateSmart(next);
      } else {
        // hydrate 전: 서버 덮어쓰기 방지. state만 갱신하고 저장은 하지 않음.
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

  // 서버에서 상태를 다시 불러오기
  async function reloadStateFromServer() {
    if (!didHydrateRef.current) return; // 초기 로드 전에는 무시
    
    // 저장이 진행 중이면 reload를 스킵 (저장 중인 변경사항이 덮어씌워지는 것 방지)
    if (isSaveInProgress()) {
      console.log("[TimeSlicer] reloadStateFromServer: skip (save in progress)");
      return;
    }

    try {
      const s = await loadStateSmart();
      if (!s) return;
      // fetch 완료 시점에 로컬에서 저장이 진행 중이면 덮어쓰지 않음
      if (isSaveInProgress()) {
        console.log("[TimeSlicer] reloadStateFromServer: skip after fetch (save in progress)");
        return;
      }
      // 방금 commit(시간 추가 등)한 직후에는 서버 응답이 아직 반영 안 됐을 수 있으므로 덮어쓰지 않음
      if (Date.now() - lastCommitTimeRef.current < RELOAD_DEBOUNCE_MS) {
        console.log("[TimeSlicer] reloadStateFromServer: skip (recent commit)");
        return;
      }
      const normalized: AppStateV1 = {
        ...s,
        weeklySpentMin: s.weeklySpentMin ?? {},
        weeklyTargetMin: s.weeklyTargetMin ?? {},
        dailyDone: s.dailyDone ?? {},
      };
      setState(normalized);
      setTimeout(() => runRolloverCheck(), 0);
    } catch (e) {
      console.error("[TimeSlicer] reloadStateFromServer failed", e);
    }
  }

  // 초기 로드: 서버-only
  React.useEffect(() => {
    (async () => {
      const s = await loadStateSmart();
      const base = (s ?? makeEmptyState()) as AppStateV1;
      const finalState: AppStateV1 = {
        ...base,
        weeklySpentMin: base.weeklySpentMin ?? {},
        weeklyTargetMin: base.weeklyTargetMin ?? {},
        dailyDone: base.dailyDone ?? {},
      };
      setState(finalState);

      didHydrateRef.current = true;
      setTimeout(() => runRolloverCheck(), 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 탭 활성화/포커스 시 서버에서 상태 다시 불러오기 + 롤오버 체크
  React.useEffect(() => {
    const onFocus = () => {
      runRolloverCheck();
      reloadStateFromServer();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        runRolloverCheck();
        reloadStateFromServer();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 주기적 동기화: 페이지가 열려있는 동안 30초마다 서버에서 최신 상태 불러오기
  React.useEffect(() => {
    if (!didHydrateRef.current) return;

    const syncInterval = window.setInterval(() => {
      // 페이지가 보이는 상태일 때만 동기화
      if (document.visibilityState === "visible") {
        reloadStateFromServer();
      }
    }, 30000); // 30초마다

    return () => window.clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 페이지를 떠나기 전에 저장이 진행 중이면 경고
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaveInProgress()) {
        // 경고 메시지 표시
        e.preventDefault();
        e.returnValue = "변경사항이 저장 중입니다. 페이지를 떠나시겠습니까?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) {
    return (
      <main className="mx-auto max-w-6xl p-6 min-h-[40vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
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

  function updateTaskTitle(taskId: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    commit((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, title: trimmed } : t
      ),
    }));
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
      weeklyTargetMin: {
        ...prev.weeklyTargetMin,
        [taskId]: Math.max(0, targetMin),
      },
    }));
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">
            Time Slicer
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Slice your day and week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
            {state.todayKey}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
            {state.weekKey}
          </span>
          <span className="hidden sm:inline font-mono text-slate-400">{clientId}</span>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Add task
        </h2>
        <AddTaskRow onAdd={addTask} />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.25fr] items-start">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Daily
          </h2>
          <DailyList
            tasks={dailyTasks}
            dailyDone={state.dailyDone}
            onToggleDone={toggleDailyDone}
            onDelete={deleteTask}
            onUpdateTitle={updateTaskTitle}
            nowMs={nowMs}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Weekly
          </h2>
          <WeeklyList
            tasks={weeklyTasks}
            weeklyTargetMin={state.weeklyTargetMin}
            weeklySpentMin={state.weeklySpentMin}
            onAddMin={addWeeklyMinutes}
            onSetTargetMin={setWeeklyTarget}
            onDelete={deleteTask}
            onUpdateTitle={updateTaskTitle}
            nowMs={nowMs}
          />
        </div>
      </section>
    </main>
  );
}
