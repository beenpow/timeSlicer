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
  const start = 0.5;
  const t = (dp - start) / (1 - start);
  return clamp01(t);
}

export function DailyList(props: {
  tasks: Task[];
  dailyDone: Record<string, boolean>;
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onRenameTask: (taskId: string, nextTitle: string) => void;
  nowMs: number;
}) {
  const { tasks, dailyDone, onToggleDone, onDelete, onRenameTask, nowMs } = props;

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

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((t) => {
        const done = !!dailyDone[t.id];
        const fade = done ? 1 : 0;
        const stress = done ? 0 : timeStress;

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={done ? "Done today" : "Not done yet"}
            fade={fade}
            stress={stress}
            onRenameTitle={(next) => onRenameTask(t.id, next)}
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
                >
                  Delete
                </button>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
