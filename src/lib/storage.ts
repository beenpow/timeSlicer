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

// ---- 저장 디바운스 (PUT 폭주 방지) ----
let pendingTimer: number | null = null;
let pendingState: AppStateV1 | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function flushSave(): Promise<void> {
  const s = pendingState;
  if (!s) return;

  const clientId = getClientId();
  try {
    await apiSaveState(s);
    console.log(`[TimeSlicer] save: server OK (${clientId}) @ ${nowIso()}`);
    pendingState = null; // 성공 시에만 초기화
    retryCount = 0;
  } catch (e) {
    console.error(`[TimeSlicer] save: server FAIL (${clientId})`, e);
    
    // 재시도 로직
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = RETRY_DELAY_MS * retryCount; // 지수 백오프
      console.log(`[TimeSlicer] save: retry ${retryCount}/${MAX_RETRIES} in ${delay}ms (${clientId})`);
      setTimeout(() => {
        void flushSave();
      }, delay);
    } else {
      console.error(`[TimeSlicer] save: max retries reached, giving up (${clientId})`);
      pendingState = null; // 포기 시 초기화
      retryCount = 0;
    }
  }
}

/**
 * Server-only save:
 * - Debounce PUT to server.
 */
export function saveStateSmart(state: AppStateV1): void {
  pendingState = state;
  if (pendingTimer) window.clearTimeout(pendingTimer);

  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    void flushSave();
  }, 800);
}
