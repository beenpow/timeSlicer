"use client";

import React from "react";
import type { Task } from "@/types/task";
import TaskCard from "./TaskCard";

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

// 하루 진행률(0..1), 로컬 시간 기준
function dayProgress(now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  return clamp01(mins / (24 * 60));
}

// 오후로 갈수록 압박(0..1)
function dailyStressFromTime(dp: number): number {
  const start = 0.5; // 12:00
  const t = (dp - start) / (1 - start);
  return clamp01(t);
}

// ✅ 너가 바꾼 기준 반영
function colsByCountDaily(n: number) {
  if (n <= 8) return 1;
  if (n <= 16) return 2;
  if (n <= 24) return 3;
  return 4;
}

export function DailyList(props: {
  tasks: Task[];
  dailyDone: Record<string, boolean>;
  onToggleDone: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onUpdateTitle?: (taskId: string, title: string) => void;
  nowMs: number;
}) {
  const { tasks, dailyDone, onToggleDone, onDelete, onUpdateTitle, nowMs } = props;

  if (tasks.length === 0) {
    return (
      <div className="card-soft p-6 text-center text-sm text-slate-500">
        No daily tasks yet. Add one above.
      </div>
    );
  }

  const dp = dayProgress(new Date(nowMs));
  const timeStress = dailyStressFromTime(dp);

  // done은 뒤로 보내서 가독성 유지
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

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={done ? "Done today" : "Not done yet"}
            done={done}
            progress={done ? 1 : 0}
            stress={stress}
            editable={!!onUpdateTitle}
            onTitleChange={onUpdateTitle ? (v) => onUpdateTitle(t.id, v) : undefined}
            right={
              <div className="flex items-center gap-1">
                <button
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    done
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-teal-500 text-white hover:bg-teal-600"
                  }`}
                  onClick={() => onToggleDone(t.id)}
                >
                  {done ? "Undo" : "Done"}
                </button>
                <button
                  className="btn-ghost-danger"
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
