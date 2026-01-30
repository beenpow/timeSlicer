"use client";

import React from "react";
import type { Task } from "@/types/task";
import { WEEKLY_INCREMENT_BUTTONS_MIN } from "@/lib/constants";
import { clampMin0, formatMinutes } from "@/lib/time";
import { TaskCard } from "./TaskCard";

export function WeeklyList(props: {
  tasks: Task[];
  weeklyTargetMin: Record<string, number>;
  weeklySpentMin: Record<string, number>;
  onAddMin: (taskId: string, deltaMin: number) => void;
  onSetTargetMin: (taskId: string, targetMin: number) => void;
  onDelete: (taskId: string) => void;
}) {
  const { tasks, weeklyTargetMin, weeklySpentMin, onAddMin, onSetTargetMin, onDelete } = props;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600 dark:text-neutral-300 bg-white/70 dark:bg-white/5">
        No weekly tasks yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((t) => {
        const spent = clampMin0(weeklySpentMin[t.id] ?? 0);
        const target = clampMin0(weeklyTargetMin[t.id] ?? 0);
        const progress = target > 0 ? Math.min(1, spent / target) : 0;

        // 네 취향: 진행될수록 회색/흐려짐(= 더 "소진" 느낌)
        const dimmed = progress >= 1 ? true : false;

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={`${formatMinutes(spent)} / ${formatMinutes(target)} (${Math.round(progress * 100)}%)`}
            dimmed={dimmed}
            right={
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => onDelete(t.id)}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            }
          >
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

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-neutral-600 dark:text-neutral-300">Target</span>
                <input
                  className="w-24 rounded-lg border px-2 py-1 text-xs bg-transparent"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => onSetTargetMin(t.id, Number(e.target.value))}
                  title="Target minutes"
                />
                <span className="text-xs text-neutral-600 dark:text-neutral-300">min</span>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full border">
              <div
                className="h-full"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                }}
              />
            </div>
          </TaskCard>
        );
      })}
    </div>
  );
}
