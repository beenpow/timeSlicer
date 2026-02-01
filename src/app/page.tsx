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
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000); // 1분마다 갱신
    return () => window.clearInterval(id);
  }, []);
  // --- 핵심: “로드 완료 전에는 절대 서버 PUT 금지”
  function commit(updater: (s: AppStateV1) => AppStateV1) {
    setState((prev) => {
      if (!prev) return prev;

      const next = updater(prev);

      // ✅ 변경 없으면 저장하지 않음 (덮어쓰기/PUT 폭주 근본 원인 제거)
      if (next === prev) return prev;

      // ✅ 로컬 저장은 항상, 서버 저장은 hydrate 이후에만
      if (didHydrateRef.current) {
        saveStateSmart(next);
      } else {
        // hydrate 전: localStorage만(서버 덮어쓰기 방지)
        // saveStateSmart는 서버까지 가므로 직접 local만 저장하는 게 이상적이지만
        // 여기서는 hydrate 전에는 commit이 발생하지 않는 게 정상 흐름.
        // 혹시 발생하면 서버 PUT을 막는 목적이라 그냥 state만 갱신.
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

      return changed ? next : prev; // ✅ 변경 없으면 prev 그대로 -> commit에서 저장 안 함
    });
  }

  // 초기 로드: 서버 우선
  React.useEffect(() => {
    (async () => {
      const local = loadState();
      try {
        const s = await loadStateSmart();
        const finalState = (s ?? local ?? makeEmptyState()) as AppStateV1;
        setState(finalState);

        // hydrate 완료 선언: 이제부터 저장하면 서버로 감
        didHydrateRef.current = true;

        // 로드 직후 1회 롤오버 체크 (자정 지나고 처음 열었을 때 반영)
        // 이때 changed가 false면 commit이 저장하지 않음
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

  // 탭이 다시 활성화될 때 롤오버 체크
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
  }, [state]); // state 변동에도 안정적으로 동작

  if (!state) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  const dailyTasks = state.tasks.filter((t) => t.kind === "daily");
  const weeklyTasks = state.tasks.filter((t) => t.kind === "weekly");

  // ---- Task ops ----
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

      // weekly는 기본 타겟 부여
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
        nowMs={nowMs}
      />
    </section>

    </main>
  );
}
