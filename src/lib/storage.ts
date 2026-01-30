"use client";

import { STORAGE_KEY, DEFAULT_WEEKLY_TARGET_MIN } from "./constants";
import { getTodayKey, getWeekKey, clampMin0 } from "./time";
import type { AppStateV1, Task, TaskKind } from "@/types/task";
import { apiLoadState, apiSaveState } from "@/lib/storage_api";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function blankState(): AppStateV1 {
  return {
    version: 1,
    tasks: [],
    todayKey: getTodayKey(),
    dailyDone: {},
    weekKey: getWeekKey(),
    weeklyTargetMin: {},
    weeklySpentMin: {},
  };
}

export function loadState(): AppStateV1 {
  if (typeof window === "undefined") return blankState();

  const parsed = safeJsonParse<AppStateV1>(window.localStorage.getItem(STORAGE_KEY));
  const base = parsed && parsed.version === 1 ? parsed : blankState();

  // Rollover checks
  const nowToday = getTodayKey();
  const nowWeek = getWeekKey();

  let next: AppStateV1 = { ...base };

  if (next.todayKey !== nowToday) {
    next.todayKey = nowToday;
    next.dailyDone = {};
  }

  if (next.weekKey !== nowWeek) {
    next.weekKey = nowWeek;
    next.weeklySpentMin = {};
    // weeklyTargetMin은 유지 (선호)
  }

  // Clean up: remove state for non-existing tasks
  const ids = new Set(next.tasks.map((t) => t.id));
  next.dailyDone = filterRecord(next.dailyDone, ids);
  next.weeklyTargetMin = filterRecord(next.weeklyTargetMin, ids);
  next.weeklySpentMin = filterRecord(next.weeklySpentMin, ids);

  // Ensure weekly tasks have default target
  for (const t of next.tasks) {
    if (t.kind === "weekly") {
      if (!Number.isFinite(next.weeklyTargetMin[t.id])) {
        next.weeklyTargetMin[t.id] = DEFAULT_WEEKLY_TARGET_MIN;
      } else {
        next.weeklyTargetMin[t.id] = clampMin0(next.weeklyTargetMin[t.id]);
      }
      if (!Number.isFinite(next.weeklySpentMin[t.id])) {
        next.weeklySpentMin[t.id] = 0;
      } else {
        next.weeklySpentMin[t.id] = clampMin0(next.weeklySpentMin[t.id]);
      }
    }
  }

  saveState(next);
  return next;
}

export function saveState(state: AppStateV1) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateJson(state: AppStateV1): string {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(raw: string): AppStateV1 {
  const parsed = safeJsonParse<AppStateV1>(raw);
  if (!parsed || parsed.version !== 1) throw new Error("Invalid state JSON (version mismatch).");
  // After import, re-run rollover + cleanup
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  }
  return loadState();
}

export function createTask(title: string, kind: TaskKind): Task {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    kind,
    createdAt: Date.now(),
  };
}

function filterRecord<T>(rec: Record<string, T>, allowed: Set<string>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

// 서버에서 불러오고 성공하면 localStorage에도 반영
export async function loadStateSmart(): Promise<AppStateV1> {
  // 1) 로컬 먼저 (즉시 UI)
  const local = loadState();

  // 2) 서버 있으면 서버 시도
  try {
    const remote = await apiLoadState();
    if (remote) {
      saveState(remote);
      return remote;
    }
  } catch {
    // 서버 실패하면 로컬로 유지
  }

  return local;
}

// 로컬 저장은 즉시, 서버 저장은 best-effort
export async function saveStateSmart(state: AppStateV1): Promise<void> {
  saveState(state);
  try {
    await apiSaveState(state);
  } catch {
    // 네트워크/서버 문제면 조용히 무시 (UX 우선)
  }
}