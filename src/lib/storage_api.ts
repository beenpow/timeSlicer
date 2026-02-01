// src/lib/storage_api.ts
import type { AppStateV1 } from "@/types/task";
import { getClientId } from "@/lib/client_id";

const RAW_BASE = process.env.NEXT_PUBLIC_TIMESLICER_API_BASE ?? "";
const TOKEN = process.env.NEXT_PUBLIC_TIMESLICER_TOKEN ?? "";

// 안전하게 base 정규화: 끝 슬래시 제거
const API_BASE = RAW_BASE.replace(/\/+$/, "");

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "X-TimeSlicer-Client": getClientId(),
  };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

export async function apiLoadState(): Promise<AppStateV1 | null> {
  if (!API_BASE) {
    console.warn("[TimeSlicer] API_BASE missing; skip apiLoadState");
    return null;
  }

  const url = `${API_BASE}/timeslicer/state`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeaders(),
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiLoadState failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // 서버는 { key, state, updatedAt } 형태
  return data.state as AppStateV1;
}

export async function apiSaveState(state: AppStateV1): Promise<void> {
  if (!API_BASE) {
    console.warn("[TimeSlicer] API_BASE missing; skip apiSaveState");
    return;
  }

  const url = `${API_BASE}/timeslicer/state`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ state }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`apiSaveState failed: ${res.status} ${text}`);
  }
}
