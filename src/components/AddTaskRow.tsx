"use client";

import React from "react";
import type { TaskKind } from "@/types/task";

export function AddTaskRow(props: {
  onAdd: (title: string, kind: TaskKind) => void;
}) {
  const { onAdd } = props;
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<TaskKind>("daily");

  function submit() {
    const t = title.trim();
    if (!t) return;
    onAdd(t, kind);
    setTitle("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3 bg-white/70 dark:bg-white/5">
      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
          placeholder="Add a task (e.g., Resume, Interview, Web Tech, ML)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <select
          className="rounded-lg border px-2 py-2 text-sm bg-transparent"
          value={kind}
          onChange={(e) => setKind(e.target.value as TaskKind)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <button
          className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
          onClick={submit}
        >
          Add
        </button>
      </div>
      <div className="text-xs text-neutral-600 dark:text-neutral-300">
        Daily resets every day. Weekly minutes reset when the week changes.
      </div>
    </div>
  );
}
