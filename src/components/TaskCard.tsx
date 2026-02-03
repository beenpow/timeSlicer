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

  // ✅ 옵션 B: 제목 수정 (웹: 더블클릭, 모바일: ✎ 버튼)
  onRenameTitle?: (nextTitle: string) => void;

  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { title, subtitle, fade = 0, stress = 0, onRenameTitle, right, children } = props;

  const f = clamp01(fade);
  const s = clamp01(stress);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(title);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    // 외부에서 title이 바뀌면(서버/동기화) 편집 중이 아닐 때만 draft도 동기화
    if (!editing) setDraft(title);
  }, [title, editing]);

  React.useEffect(() => {
    if (editing) {
      // 포커스 + 끝으로 커서
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        const el = inputRef.current;
        if (el) {
          const n = el.value.length;
          el.setSelectionRange(n, n);
        }
      });
    }
  }, [editing]);

  const canEdit = !!onRenameTitle;

  function startEdit() {
    if (!canEdit) return;
    setDraft(title);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(title);
    setEditing(false);
  }

  function commitEdit() {
    if (!canEdit) return;

    const next = draft.trim();
    if (!next) {
      // 빈 제목은 취소 처리
      cancelEdit();
      return;
    }

    if (next !== title) {
      onRenameTitle?.(next);
    }
    setEditing(false);
  }

  // fade: 회색 + 흐림 + 투명도
  // 편집 중엔 가독성 위해 filter 제거
  const opacity = editing ? 1 : 1 - 0.35 * f;
  const gray = editing ? 0 : f;
  const blurPx = editing ? 0 : 0.8 * f;

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
      className={["rounded-xl border p-4 shadow-sm transition", bgClass, stressClass].join(" ")}
      style={{
        opacity,
        filter: `grayscale(${gray}) blur(${blurPx}px)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* title row */}
          <div className="flex items-start gap-2 min-w-0">
            {/* Desktop: 더블클릭으로 편집 진입 */}
            {!editing ? (
              <div
                className="min-w-0 flex-1 truncate text-base font-semibold"
                onDoubleClick={() => startEdit()}
                title={canEdit ? "Double-click to edit" : undefined}
              >
                {title}
              </div>
            ) : (
              <input
                ref={inputRef}
                className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm bg-white/80 dark:bg-white/10"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                aria-label="Edit title"
              />
            )}

            {/* Mobile: ✎ 버튼으로 편집 진입 (옵션 B) */}
            {canEdit && !editing ? (
              <button
                className="sm:hidden shrink-0 rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                title="Edit"
                aria-label="Edit title"
              >
                ✎
              </button>
            ) : null}
          </div>

          {subtitle ? (
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{subtitle}</div>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export default TaskCard;
