"use client";

import React from "react";

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function TaskCard(props: {
  title: string;
  subtitle?: string;

  // 0..1: 0이면 선명, 1이면 최대 흐림
  fade?: number;

  // 0..1: 0이면 경고 없음, 1이면 강한 압박 톤
  stress?: number;

  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { title, subtitle, fade = 0, stress = 0, right, children } = props;

  const f = clamp01(fade);
  const s = clamp01(stress);

  // fade: 회색 + 흐림 + 투명도
  const opacity = 1 - 0.35 * f; // 최대 35%만 낮추기
  const gray = f; // 0..1
  const blurPx = 0.8 * f; // 최대 0.8px 정도만 (너무 흐리면 가독성 떨어짐)

  // stress: 경고 톤 (단계형)
  let stressClass = "";
  if (s >= 0.66) stressClass = "ring-2 ring-red-400/60 border-red-300/60";
  else if (s >= 0.33) stressClass = "ring-2 ring-amber-400/50 border-amber-300/60";
  else stressClass = "ring-0";

  // 아주 살짝 배경 틴트
  const bgClass =
    s >= 0.66
      ? "bg-red-50/60 dark:bg-red-500/10"
      : s >= 0.33
        ? "bg-amber-50/60 dark:bg-amber-500/10"
        : "bg-white/70 dark:bg-white/5";

  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-sm transition",
        bgClass,
        stressClass,
      ].join(" ")}
      style={{
        opacity,
        filter: `grayscale(${gray}) blur(${blurPx}px)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export default TaskCard;
