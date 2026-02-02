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
