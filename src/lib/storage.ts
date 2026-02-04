// src/lib/storage.ts
import type { AppStateV1 } from "@/types/task";
import { apiLoadState, apiSaveState } from "@/lib/storage_api";
import { getClientId } from "@/lib/client_id";

function nowIso(): string {
  return new Date().toISOString();
}

// Server-only mode: never read from localStorage.
export function loadState(): AppStateV1 | null {
  return null;
}

// Server-only mode: never write to localStorage.
export function saveState(state: AppStateV1): void {
  void state;
}

/**
 * Server-only load:
 * - Always try server first.
 * - No local fallback.
 */
export async function loadStateSmart(): Promise<AppStateV1 | null> {
  const clientId = getClientId();

  try {
    const remote = await apiLoadState();
    if (remote) {
      console.log(`[TimeSlicer] load: server OK (${clientId}) @ ${nowIso()}`);
      return remote;
    }
    console.log(`[TimeSlicer] load: server EMPTY (${clientId}) @ ${nowIso()}`);
    return null;
  } catch (e) {
    console.error(`[TimeSlicer] load: server FAIL (${clientId})`, e);
    return null;
  }
}

// ---- 즉시 저장 (디바운스 없음) ----
let isSaving = false; // 저장 진행 중 플래그
let saveQueue: AppStateV1 | null = null; // 저장 대기 중인 상태 (최신 것만 유지)
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * 저장이 진행 중인지 확인
 */
export function isSaveInProgress(): boolean {
  return isSaving || saveQueue !== null;
}

async function saveStateInternal(state: AppStateV1): Promise<void> {
  const clientId = getClientId();
  try {
    await apiSaveState(state);
    console.log(`[TimeSlicer] save: server OK (${clientId}) @ ${nowIso()}`);
    retryCount = 0;
    isSaving = false;
    
    // 큐에 더 최신 상태가 있으면 그것도 저장
    if (saveQueue !== null) {
      const next = saveQueue;
      saveQueue = null;
      isSaving = true;
      await saveStateInternal(next);
    }
  } catch (e) {
    console.error(`[TimeSlicer] save: server FAIL (${clientId})`, e);
    
    // 재시도 로직
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = RETRY_DELAY_MS * retryCount; // 지수 백오프
      console.log(`[TimeSlicer] save: retry ${retryCount}/${MAX_RETRIES} in ${delay}ms (${clientId})`);
      setTimeout(async () => {
        await saveStateInternal(state);
      }, delay);
    } else {
      console.error(`[TimeSlicer] save: max retries reached, giving up (${clientId})`);
      retryCount = 0;
      isSaving = false;
      
      // 실패해도 큐에 있는 다음 상태는 시도
      if (saveQueue !== null) {
        const next = saveQueue;
        saveQueue = null;
        isSaving = true;
        await saveStateInternal(next);
      }
    }
  }
}

/**
 * Server-only save:
 * - 즉시 저장 (디바운스 없음)
 * - 저장 중이면 큐에 추가 (최신 상태만 유지)
 */
export function saveStateSmart(state: AppStateV1): void {
  if (isSaving) {
    // 저장 중이면 큐에 추가 (이전 큐는 덮어쓰기 - 최신 것만 필요)
    saveQueue = state;
    return;
  }

  // 즉시 저장 시작
  isSaving = true;
  void saveStateInternal(state);
}
