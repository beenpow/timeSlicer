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

  /** 제목 클릭 시 인라인 편집 가능 */
  editable?: boolean;
  onTitleChange?: (newTitle: string) => void;
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
  editable = false,
  onTitleChange,
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(title);
  }, [title]);

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleCommit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) onTitleChange?.(trimmed);
    setIsEditing(false);
    setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCommit();
    if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

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
      className="card-soft min-w-0 overflow-visible p-4 transition-all duration-200"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 overflow-hidden flex-1">
          {editable && onTitleChange && isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="w-full text-sm font-semibold bg-transparent border-b border-slate-300 py-0.5 outline-none focus:border-teal-500"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              aria-label="Edit task title"
            />
          ) : editable && onTitleChange ? (
            <button
              type="button"
              className="w-full text-left text-sm font-semibold break-words text-slate-800 hover:text-teal-600 focus:outline-none focus:text-teal-600"
              onClick={() => setIsEditing(true)}
            >
              {title}
            </button>
          ) : (
            <div className="text-sm font-semibold break-words text-slate-800">{title}</div>
          )}
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>

        <div className="shrink-0 flex items-center gap-1">{right}</div>
      </div>

      {children && <div className="mt-2 pt-2 border-t border-slate-100">{children}</div>}
    </div>
  );
}
