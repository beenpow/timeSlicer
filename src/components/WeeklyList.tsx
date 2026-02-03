"use client";

import React from "react";
import type { Task } from "@/types/task";
import { clampMin0, formatMinutes } from "@/lib/time";
import TaskCard from "./TaskCard";

/* ---------- utils ---------- */

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

// 주 진행률 (0..1)
function weekElapsed(now = new Date()): number {
  const jsDay = now.getDay(); // Sun=0..Sat=6
  const mon0 = (jsDay + 6) % 7; // Mon=0..Sun=6
  const minsToday = now.getHours() * 60 + now.getMinutes();
  const mins = mon0 * 24 * 60 + minsToday;
  return clamp01(mins / (7 * 24 * 60));
}

function weekEndPressure(we: number): number {
  const start = 0.55;
  const t = (we - start) / (1 - start);
  return clamp01(t);
}

// ✅ 컬럼 규칙 (너가 준 기준)
function colsByCountWeekly(n: number) {
  if (n <= 15) return 1;
  if (n <= 30) return 2;
  return 3;
}

// ✅ status bar 색 결정
function progressBarClass(actual: number, stress: number) {
  if (actual >= 1) return "bg-emerald-500";
  if (stress > 0.6) return "bg-rose-500";
  if (stress > 0.3) return "bg-amber-400";
  return "bg-sky-500";
}

/* ---------- types ---------- */

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

/* ---------- component ---------- */

export function WeeklyList(props: Props) {
  const {
    tasks,
    weeklyTargetMin,
    weeklySpentMin,
    onAddMin,
    onSetTargetMin,
    onDelete,
    nowMs,
  } = props;

  const [openId, setOpenId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // outside click
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

  // esc close
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600 bg-white/70">
        No weekly tasks yet.
      </div>
    );
  }

  const we = weekElapsed(new Date(nowMs));
  const endPressure = weekEndPressure(we);

  // 진행률 낮은 순
  const sorted = [...tasks].sort((a, b) => {
    const aSpent = clampMin0(weeklySpentMin[a.id] ?? 0);
    const bSpent = clampMin0(weeklySpentMin[b.id] ?? 0);
    const aTarget = Math.max(1, clampMin0(weeklyTargetMin[a.id] ?? 1));
    const bTarget = Math.max(1, clampMin0(weeklyTargetMin[b.id] ?? 1));
    return aSpent / aTarget - bSpent / bTarget;
  });

  const cols = colsByCountWeekly(sorted.length);

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {sorted.map((t) => {
        const spent = clampMin0(weeklySpentMin[t.id] ?? 0);
        const target = clampMin0(weeklyTargetMin[t.id] ?? 0);

        const actual = target > 0 ? clamp01(spent / target) : 0;
        const done = actual >= 1;

        const expected = we;
        const behind = clamp01(expected - actual);
        const stress = done
          ? 0
          : clamp01(Math.max(endPressure * 0.8, behind * 1.2));

        const isOpen = openId === t.id;
        const statsText = `${formatMinutes(spent)} / ${formatMinutes(
          target
        )} (${Math.round(actual * 100)}%)`;

        return (
          <TaskCard
            key={t.id}
            title={t.title}
            progress={actual}
            done={done}
            stress={stress}
            right={
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100"
                onClick={() => onDelete(t.id)}
                aria-label="Delete"
              >
                ✕
              </button>
            }
          >
            {/* ===== Desktop (sm+) ===== */}
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <div className="w-40 text-xs opacity-70 truncate">{statsText}</div>

              {/* dropdown */}
              <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
                <button
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100"
                  onClick={() => setOpenId(isOpen ? null : t.id)}
                >
                  + ▾
                </button>

                {isOpen && (
                  <div className="absolute right-0 top-full mt-2 w-28 rounded-xl border bg-white shadow z-20 overflow-hidden">
                    {MENU_ITEMS.map((it) => (
                      <button
                        key={it.label}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100"
                        onClick={() => {
                          onAddMin(t.id, it.delta);
                          setOpenId(null);
                        }}
                      >
                        {it.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* progress */}
              <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${progressBarClass(
                    actual,
                    stress
                  )}`}
                  style={{ width: `${Math.round(actual * 100)}%` }}
                />
              </div>

              {/* target */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs">Target</span>
                <input
                  className="w-16 rounded-lg border px-2 py-1 text-xs"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) =>
                    onSetTargetMin(t.id, Number(e.target.value))
                  }
                />
                <span className="text-xs">min</span>
              </div>
            </div>

            {/* ===== Mobile ===== */}
            <div className="sm:hidden min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs opacity-70 truncate">
                  {statsText}
                </div>

                <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
                  <button
                    className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => setOpenId(isOpen ? null : t.id)}
                  >
                    + ▾
                  </button>

                  {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-28 rounded-xl border bg-white shadow z-20 overflow-hidden">
                      {MENU_ITEMS.map((it) => (
                        <button
                          key={it.label}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100"
                          onClick={() => {
                            onAddMin(t.id, it.delta);
                            setOpenId(null);
                          }}
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${progressBarClass(
                      actual,
                      stress
                    )}`}
                    style={{ width: `${Math.round(actual * 100)}%` }}
                  />
                </div>

                <span className="text-xs">T</span>
                <input
                  className="w-14 rounded-lg border px-2 py-1 text-xs"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) =>
                    onSetTargetMin(t.id, Number(e.target.value))
                  }
                />
              </div>
            </div>
          </TaskCard>
        );
      })}
    </div>
  );
}

export default WeeklyList;
