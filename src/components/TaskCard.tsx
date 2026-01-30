"use client";

import React from "react";

export function TaskCard(props: {
  title: string;
  subtitle?: string;
  dimmed?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { title, subtitle, dimmed, right, children } = props;
  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-sm",
        "bg-white/70 dark:bg-white/5",
        dimmed ? "opacity-50 grayscale" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
