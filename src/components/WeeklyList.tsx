"use client";

import React from "react";
import type { Task } from "@/types/task";
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
  if (n <= 15) return 1;
  if (n <= 30) return 2;
  return 3;
}

type Props = {
  tasks: Task[];
  weeklyTargetMin: Record<string, number>;
  weeklySpentMin: Record<string, number>;
  onAddMin: (taskId: string, deltaMin: number) => void;
  onSetTargetMin: (taskId: string, targetMin: number) => void;
  onDelete: (taskId: string) => void;
  nowMs: number;
};

const MENU_ITEMS: Array<{ label: string; delta: number }> = [
  { label: "+15m", delta: 15 },
  { label: "+30m", delta: 30 },
  { label: "+60m", delta: 60 },
  { label: "-15m", delta: -15 },
];

export function WeeklyList(props: Props) {
  const { tasks, weeklyTargetMin, weeklySpentMin, onAddMin, onSetTargetMin, onDelete, nowMs } =
    props;

  const [openId, setOpenId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!openId) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpenId(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openId]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
    return aSpent / aTarget - bSpent / bTarget;
  });

  const cols = colsByCountWeekly(sorted.length);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {sorted.map((t) => {
        const spent = clampMin0(weeklySpentMin[t.id] ?? 0);
        const target = clampMin0(weeklyTargetMin[t.id] ?? 0);

        const actual = target > 0 ? clamp01(spent / target) : 0;
        const done = actual >= 1;

        const expected = we;
        const behind = clamp01(expected - actual);
        const stress = done ? 0 : clamp01(Math.max(endPressure * 0.8, behind * 1.2));

        const isOpen = openId === t.id;

        const statsText = `${formatMinutes(spent)} / ${formatMinutes(target)} (${Math.round(
          actual * 100
        )}%)`;

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            subtitle={undefined}
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
            <div className="flex items-center gap-2">
              {/* ✅ stats 영역 폭 고정 → 다음 요소들이 칼같이 정렬됨 */}
              <div className="text-xs opacity-70 w-40 shrink-0 truncate">
                {statsText}
              </div>

              {/* + 드롭다운 */}
              <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => setOpenId(isOpen ? null : t.id)}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  title="Add time"
                >
                  + <span className="opacity-70">▾</span>
                </button>

                {isOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-28 rounded-xl border bg-white shadow-lg dark:bg-neutral-900 z-20 overflow-hidden"
                    role="menu"
                  >
                    {MENU_ITEMS.map((it, idx) => {
                      const isLast = idx === MENU_ITEMS.length - 1;
                      return (
                        <button
                          key={it.label}
                          className={[
                            "w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-white/10",
                            isLast ? "" : "border-b border-neutral-100 dark:border-white/5",
                          ].join(" ")}
                          onClick={() => {
                            onAddMin(t.id, it.delta);
                            setOpenId(null);
                          }}
                          role="menuitem"
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 진행바 */}
              <div className="flex-1 h-2 overflow-hidden rounded-full border bg-white/40 dark:bg-white/10 min-w-[64px]">
                <div
                  className="h-full bg-neutral-900/70 dark:bg-white/60"
                  style={{ width: `${Math.round(actual * 100)}%` }}
                />
              </div>

              {/* Target */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-neutral-700 dark:text-neutral-200">Target</span>
                <input
                  className="w-16 rounded-lg border px-2 py-1 text-xs bg-transparent"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => onSetTargetMin(t.id, Number(e.target.value))}
                  title="Target minutes"
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-200">min</span>
              </div>
            </div>
          </TaskCard>
        );
      })}
    </div>
  );
}
