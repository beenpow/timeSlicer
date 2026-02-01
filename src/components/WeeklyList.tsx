"use client";

import React from "react";
import type { Task } from "@/types/task";
import { WEEKLY_INCREMENT_BUTTONS_MIN } from "@/lib/constants";
import { clampMin0, formatMinutes } from "@/lib/time";
import TaskCard from "./TaskCard";

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function weekElapsed(now = new Date()): number {
  const jsDay = now.getDay();
  const mon0 = (jsDay + 6) % 7;
  const minsToday = now.getHours() * 60 + now.getMinutes();
  const mins = mon0 * 24 * 60 + minsToday;
  const total = 7 * 24 * 60;
  return clamp01(mins / total);
}

function weekEndPressure(we: number): number {
  const start = 0.55;
  const t = (we - start) / (1 - start);
  return clamp01(t);
}

function colsByCountWeekly(n: number) {
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  return 3;
}

export function WeeklyList(props: {
  tasks: Task[];
  weeklyTargetMin: Record<string, number>;
  weeklySpentMin: Record<string, number>;
  onAddMin: (taskId: string, deltaMin: number) => void;
  onSetTargetMin: (taskId: string, targetMin: number) => void;
  onDelete: (taskId: string) => void;
  nowMs: number;
}) {
  const { tasks, weeklyTargetMin, weeklySpentMin, onAddMin, onSetTargetMin, onDelete, nowMs } = props;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600 dark:text-neutral-300 bg-white/70 dark:bg-white/5">
        No weekly tasks yet.
      </div>
    );
  }

  const we = weekElapsed(new Date(nowMs));
  const endPressure = weekEndPressure(we);

  const sorted = [...tasks].sort((a, b) => {
    const aSpent = clampMin0(weeklySpentMin[a.id] ?? 0);
    const bSpent = clampMin0(weeklySpentMin[b.id] ?? 0);

    const aTarget = Math.max(1, clampMin0(weeklyTargetMin[a.id] ?? 1));
    const bTarget = Math.max(1, clampMin0(weeklyTargetMin[b.id] ?? 1));

    const aProgress = aSpent / aTarget;
    const bProgress = bSpent / bTarget;

    return aProgress - bProgress;
  });

  const cols = colsByCountWeekly(sorted.length);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {sorted.map((t) => {
        const spent = clampMin0(weeklySpentMin[t.id] ?? 0);
        const target = clampMin0(weeklyTargetMin[t.id] ?? 0);

        const actual = target > 0 ? clamp01(spent / target) : 0;
        const expected = we;

        const behind = clamp01(expected - actual);

        // ✅ 진행 중(0~1)은 회색톤으로만 반영
        // ✅ 완료(1)는 연초록 + 배지로 확실히 구분
        const done = actual >= 1;

        // "압박"은: 주말압박 vs 뒤쳐짐 둘 다 고려
        const stress = done ? 0 : clamp01(Math.max(endPressure * 0.8, behind * 1.2));

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={`${formatMinutes(spent)} / ${formatMinutes(target)} (${Math.round(actual * 100)}%)`}
            progress={actual}
            done={done}
            stress={stress}
            right={
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                onClick={() => onDelete(t.id)}
                title="Delete"
              >
                Delete
              </button>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {WEEKLY_INCREMENT_BUTTONS_MIN.map((m) => (
                  <button
                    key={m}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                    onClick={() => onAddMin(t.id, m)}
                  >
                    +{m}m
                  </button>
                ))}
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => onAddMin(t.id, -15)}
                >
                  -15m
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-neutral-700 dark:text-neutral-200">Target</span>
                <input
                  className="w-20 rounded-lg border px-2 py-1 text-xs bg-transparent"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => onSetTargetMin(t.id, Number(e.target.value))}
                  title="Target minutes"
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-200">min</span>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full border bg-white/40 dark:bg-white/10">
              <div className="h-full bg-neutral-900/70 dark:bg-white/60" style={{ width: `${Math.round(actual * 100)}%` }} />
            </div>

            <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
              {done
                ? "Completed."
                : stress >= 0.66
                ? "Behind schedule. Consider adding time soon."
                : stress >= 0.33
                ? "Week is moving. Keep pace."
                : "On track."}
            </div>
          </TaskCard>
        );
      })}
    </div>
  );
}
