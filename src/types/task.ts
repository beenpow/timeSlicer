export type TaskKind = "daily" | "weekly";

export type Task = {
  id: string;
  title: string;
  kind: TaskKind;
  createdAt: number; // epoch ms
};

export type AppStateV1 = {
  version: 1;

  tasks: Task[];

  // Daily
  todayKey: string; // YYYY-MM-DD
  dailyDone: Record<string, boolean>; // taskId -> done today

  // Weekly
  weekKey: string; // YYYY-WW (ISO-ish)
  weeklyTargetMin: Record<string, number>; // taskId -> target minutes
  weeklySpentMin: Record<string, number>; // taskId -> spent minutes this week
};
