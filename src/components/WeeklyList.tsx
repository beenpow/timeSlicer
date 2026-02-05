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
  onUpdateTitle?: (taskId: string, title: string) => void;
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
    onUpdateTitle,
    nowMs,
  } = props;

  const [openId, setOpenId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // outside click — mousedown이면 +15m 클릭 전에 드롭다운이 닫혀서 click이 안 나감. click 사용.
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!openId) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpenId(null);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
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
      <div className="card-soft p-6 text-center text-sm text-slate-500">
        No weekly tasks yet. Add one above.
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

  const totalSpent = sorted.reduce(
    (acc, t) => acc + clampMin0(weeklySpentMin[t.id] ?? 0),
    0
  );
  const totalTarget = sorted.reduce(
    (acc, t) => acc + Math.max(0, weeklyTargetMin[t.id] ?? 0),
    0
  );
  const maxTarget = Math.max(
    ...sorted.map((t) => Math.max(1, clampMin0(weeklyTargetMin[t.id] ?? 0))),
    1
  );

  return (
    <div className="space-y-4">
      {/* 이번 주 할당·진행 요약 — 막대 길이 = 목표 시간(절대), 채움 = 진행률 */}
      <div className="card-soft p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            This week
          </span>
          <span className="text-xs text-slate-500 tabular-nums">
            {formatMinutes(totalSpent)} / {formatMinutes(totalTarget)}
          </span>
        </div>
        <div className="space-y-2.5">
          {sorted.map((t) => {
            const spent = clampMin0(weeklySpentMin[t.id] ?? 0);
            const target = Math.max(1, clampMin0(weeklyTargetMin[t.id] ?? 0));
            const ratio = spent / target;
            const done = ratio >= 1;
            const barWidthPct = (target / maxTarget) * 100;
            const fillPct = Math.min(100, ratio * 100);
            const barColor = done
              ? "bg-emerald-500"
              : ratio > 0.6
                ? "bg-amber-400"
                : ratio > 0.3
                  ? "bg-sky-500"
                  : "bg-slate-300";
            return (
              <div key={t.id} className="flex items-center gap-3 min-w-0">
                <span
                  className="text-xs text-slate-600 truncate shrink-0 w-20 sm:w-24"
                  title={t.title}
                >
                  {t.title}
                </span>
                <div className="flex-1 min-w-0 flex items-center">
                  <div
                    className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex shrink-0"
                    style={{
                      width: `${barWidthPct}%`,
                      minWidth: "4px",
                    }}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${fillPct}%`, minWidth: "2px" }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500 tabular-nums shrink-0 w-14 sm:w-20 text-right">
                  {formatMinutes(spent)} / {formatMinutes(target)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
            editable={!!onUpdateTitle}
            onTitleChange={onUpdateTitle ? (v) => onUpdateTitle(t.id, v) : undefined}
            right={
              <button
                className="btn-ghost-danger"
                onClick={() => onDelete(t.id)}
                aria-label="Delete"
              >
                ✕
              </button>
            }
          >
            {/* ===== Desktop (sm+) ===== */}
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <div className="w-40 text-xs text-slate-500 truncate">{statsText}</div>

              {/* dropdown */}
              <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
                <button
                  className="rounded-lg bg-teal-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-600"
                  onClick={() => setOpenId(isOpen ? null : t.id)}
                >
                  + ▾
                </button>

                {isOpen && (
                  <div className="absolute right-0 top-full mt-2 w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20 overflow-hidden">
                    {MENU_ITEMS.map((it) => (
                      <button
                        key={it.label}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
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
              <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${progressBarClass(
                    actual,
                    stress
                  )}`}
                  style={{ width: `${Math.round(actual * 100)}%` }}
                />
              </div>

              {/* target */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">Target</span>
                <input
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) =>
                    onSetTargetMin(t.id, Number(e.target.value))
                  }
                />
                <span className="text-xs text-slate-500">min</span>
              </div>
            </div>

            {/* ===== Mobile ===== */}
            <div className="sm:hidden min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-slate-500 truncate">
                  {statsText}
                </div>

                <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
                  <button
                    className="rounded-lg bg-teal-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-600"
                    onClick={() => setOpenId(isOpen ? null : t.id)}
                  >
                    + ▾
                  </button>

                  {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20 overflow-hidden">
                      {MENU_ITEMS.map((it) => (
                        <button
                          key={it.label}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
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
                <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${progressBarClass(
                      actual,
                      stress
                    )}`}
                    style={{ width: `${Math.round(actual * 100)}%` }}
                  />
                </div>

                <span className="text-xs text-slate-500">T</span>
                <input
                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-teal-400"
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
    </div>
  );
}

export default WeeklyList;
