"use client";

import type { AppStateV1 } from "@/types/task";

const API_BASE = process.env.NEXT_PUBLIC_TIMESLICER_API_BASE;
const TOKEN = process.env.NEXT_PUBLIC_TIMESLICER_TOKEN;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (TOKEN && TOKEN.trim().length > 0) {
    h["Authorization"] = `Bearer ${TOKEN.trim()}`;
  }
  return h;
}

export async function apiLoadState(): Promise<AppStateV1 | null> {
  if (!API_BASE) return null;

  const res = await fetch(`${API_BASE}/timeslicer/state`, {
    method: "GET",
    headers: {
      ...authHeaders(),
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`apiLoadState failed: ${res.status}`);

  const data = await res.json();
  // 서버는 state를 string(JSON)로 반환하게 만들어둠
  return data.state as AppStateV1;
}

export async function apiSaveState(state: AppStateV1): Promise<void> {
  if (!API_BASE) return;

  const res = await fetch(`${API_BASE}/timeslicer/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ state }),
  });

  if (!res.ok) throw new Error(`apiSaveState failed: ${res.status}`);
}
