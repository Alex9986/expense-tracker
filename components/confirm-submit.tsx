"use client";

import { useFormStatus } from "react-dom";
import { TrashIcon } from "@/components/icons";

/**
 * 带二次确认的提交按钮。
 *
 * 删除类操作一律走这里。用原生的 confirm() 而不是自绘弹窗：
 * 原生确认框无法被页面样式影响，也就不存在「确认框被 z-index 盖住导致
 * 用户点不到」这类问题，而且它天然阻塞，实现上不会出现竞态。
 * 对不可撤销的删除操作，这点确定性比视觉一致性更重要。
 */
export function ConfirmSubmit({
  confirmMessage,
  ariaLabel,
}: {
  confirmMessage: string;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      <TrashIcon />
    </button>
  );
}
