"use client";

import React from "react";
import type { Task } from "@/types/task";
import TaskCard from "./TaskCard";

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function dayProgress(now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  return clamp01(mins / (24 * 60));
}

function dailyStressFromTime(dp: number): number {
  const start = 0.5; // 12:00
  const t = (dp - start) / (1 - start);
  return clamp01(t);
}

function colsByCountDaily(n: number) {
  if (n <= 5) return 1;
  if (n <= 10) return 2;
  if (n <= 15) return 3;
  return 4;
}

export function DailyList(props: {
  tasks: Task[];
  dailyDone: Record<string, boolean>;
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  nowMs: number;
}) {
  const { tasks, dailyDone, onToggleDone, onDelete, nowMs } = props;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600 dark:text-neutral-300 bg-white/70 dark:bg-white/5">
        No daily tasks yet.
      </div>
    );
  }

  const dp = dayProgress(new Date(nowMs));
  const timeStress = dailyStressFromTime(dp);

  const sorted = [...tasks].sort((a, b) => {
    const ad = !!dailyDone[a.id];
    const bd = !!dailyDone[b.id];
    return Number(ad) - Number(bd);
  });

  const cols = colsByCountDaily(sorted.length);

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {sorted.map((t) => {
        const done = !!dailyDone[t.id];
        const stress = done ? 0 : timeStress;

        // ✅ 오른쪽 폭 절약:
        // - 토글 버튼은 Done/Undo 중 하나만 표시
        // - Delete는 아이콘으로
        // - Done 배지는 TaskCard 내부에 표시되지만 (right 영역 말고) subtitle로도 충분
        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={done ? "Done today" : "Not done yet"}
            done={done}
            progress={done ? 1 : 0}
            stress={stress}
            right={
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => onToggleDone(t.id)}
                >
                  {done ? "Undo" : "Done"}
                </button>

                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => onDelete(t.id)}
                  title="Delete"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
