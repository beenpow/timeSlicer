// src/lib/client_id.ts
//
// Server-only mode:
// - Do NOT persist any client identifier in localStorage.
// - All devices should see the same shared server state.
//
// NOTE: The backend keys state by the "X-TimeSlicer-Client" header.
// Using a constant here makes the app behave like a single shared user.

export function getClientId(): string {
  return "default";
}
