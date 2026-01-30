"use client";

import React from "react";
import type { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";

export function DailyList(props: {
  tasks: Task[];
  dailyDone: Record<string, boolean>;
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const { tasks, dailyDone, onToggleDone, onDelete } = props;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600 dark:text-neutral-300 bg-white/70 dark:bg-white/5">
        No daily tasks yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((t) => {
        const done = !!dailyDone[t.id];
        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={done ? "Done today" : "Not done yet"}
            dimmed={done}
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
