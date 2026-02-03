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
    <div className="card-soft flex flex-col gap-3 p-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input-soft flex-1 min-w-0"
          placeholder="Add a task (e.g., Resume, Interview, Web Tech, ML)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <div className="flex gap-2">
          <select
            className="input-soft w-full sm:w-auto min-w-[6rem]"
            value={kind}
            onChange={(e) => setKind(e.target.value as TaskKind)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600 active:bg-teal-700 shrink-0"
            onClick={submit}
          >
            Add
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Daily resets every day. Weekly minutes reset when the week changes.
      </p>
    </div>
  );
}
