// src/lib/client_id.ts
import { STORAGE_KEY } from "@/lib/constants";

const CLIENT_ID_KEY = `${STORAGE_KEY}:client_id`;

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;

    const id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cid_${Math.random().toString(16).slice(2)}_${Date.now()}`);

    window.localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return "cid_unavailable";
  }
}
