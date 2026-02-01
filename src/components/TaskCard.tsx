"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;

  /** 0..1 */
  progress?: number;

  /** 완료 상태 */
  done?: boolean;

  /** 0..1 */
  stress?: number;

  right?: React.ReactNode;
  children?: React.ReactNode;
};

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function TaskCard({
  title,
  subtitle,
  progress = 0,
  done = false,
  stress = 0,
  right,
  children,
}: Props) {
  const p = clamp01(progress);
  const s = clamp01(stress);

  // 진행 중: 회색 톤만 아주 살짝 진해짐 (가독성 유지)
  const grayAlpha = done ? 0 : 0.02 + 0.08 * p;

  // 완료: 연초록 + 테두리로만 "완료"를 표현 (텍스트 배지 없음)
  const doneBg = "rgba(34, 197, 94, 0.12)";
  const doneBorder = "rgba(34, 197, 94, 0.45)";

  const isHighStress = s > 0.6;
  const isMidStress = s > 0.3;

  let borderColor = "rgba(229, 231, 235, 1)"; // neutral-200
  let bgColor = `rgba(0, 0, 0, ${grayAlpha})`;

  if (done) {
    bgColor = doneBg;
    borderColor = doneBorder;
  } else if (isHighStress) {
    borderColor = "rgba(252, 165, 165, 1)"; // red-300
  } else if (isMidStress) {
    borderColor = "rgba(252, 211, 77, 1)"; // amber-300
  }

  return (
    <div
      className="rounded-xl border p-3 transition min-w-0 bg-white/70 dark:bg-white/5"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold break-words">{title}</div>
          {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
        </div>

        {/* 오른쪽은 "액션만" */}
        <div className="shrink-0">{right}</div>
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
