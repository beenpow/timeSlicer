// src/lib/storage.ts
import type { AppStateV1 } from "@/types/task";
import { STORAGE_KEY } from "@/lib/constants";
import { apiLoadState, apiSaveState } from "@/lib/storage_api";
import { getClientId } from "@/lib/client_id";

function nowIso(): string {
  return new Date().toISOString();
}

export function loadState(): AppStateV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppStateV1;
  } catch {
    return null;
  }
}

export function saveState(state: AppStateV1): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * 서버 우선 로드:
 * 1) 서버에서 state를 가져오면 그걸 즉시 반환 + localStorage 동기화
 * 2) 서버에 없으면(local 404) localStorage 사용
 * 3) 서버 실패하면(local) localStorage 사용
 */
export async function loadStateSmart(): Promise<AppStateV1> {
  const clientId = getClientId();
  const local = loadState();

  try {
    const remote = await apiLoadState();
    if (remote) {
      console.log(`[TimeSlicer] load: server OK (${clientId}) @ ${nowIso()}`);
      saveState(remote);
      return remote;
    }
    console.log(`[TimeSlicer] load: server EMPTY (${clientId}) @ ${nowIso()}`);
  } catch (e) {
    console.error(`[TimeSlicer] load: server FAIL (${clientId})`, e);
  }

  if (local) {
    console.log(`[TimeSlicer] load: local OK (${clientId}) @ ${nowIso()}`);
    return local;
  }

  // local도 없으면 최소 초기값은 page.tsx에서 생성하는 걸 권장하지만,
  // 여기서는 null 대신 throw 하지 않고 page.tsx에서 기본값 만들게 두는 편이 안전.
  console.log(`[TimeSlicer] load: local EMPTY (${clientId}) @ ${nowIso()}`);
  // @ts-expect-error - page.tsx에서 fallback 생성할 것
  return null;
}

// ---- 저장 디바운스 (PUT 폭주 방지) ----
let pendingTimer: number | null = null;
let pendingState: AppStateV1 | null = null;

async function flushSave(): Promise<void> {
  const s = pendingState;
  pendingState = null;
  if (!s) return;

  const clientId = getClientId();
  try {
    await apiSaveState(s);
    console.log(`[TimeSlicer] save: server OK (${clientId}) @ ${nowIso()}`);
  } catch (e) {
    console.error(`[TimeSlicer] save: server FAIL (${clientId})`, e);
  }
}

/**
 * 로컬 저장은 즉시, 서버 저장은 디바운스해서 1번만 보내기
 */
export function saveStateSmart(state: AppStateV1): void {
  saveState(state);

  pendingState = state;
  if (pendingTimer) window.clearTimeout(pendingTimer);

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    void flushSave();
  }, 800);
}
