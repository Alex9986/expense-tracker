"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAllDataAction } from "@/app/actions/categories";
import { Button, FormError } from "@/components/ui";

/**
 * 清空全部数据的危险操作。
 *
 * 要求用户手动输入确认词，而不是点一次「确定」：
 * 这是本应用唯一不可撤销且影响全部历史记录的破坏性操作，
 * 一个误点的代价过高，多一步输入是值得的摩擦。
 */
export function ClearDataButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const CONFIRM_WORD = "清空";

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        清空数据
      </Button>
    );
  }

  return (
    <div className="w-full">
      <FormError message={error} />
      <p className="mt-2 text-[12.5px] text-muted">
        请输入 <b className="text-danger">{CONFIRM_WORD}</b> 两个字以确认。
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          aria-label="输入确认词"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-danger"
        />
        <Button
          variant="danger"
          disabled={typed !== CONFIRM_WORD || pending}
          onClick={async () => {
            setPending(true);
            setError(undefined);
            try {
              const result = await clearAllDataAction();
              if (result.ok) {
                setConfirming(false);
                setTyped("");
                router.refresh();
              } else {
                setError(result.message ?? "操作失败");
              }
            } catch {
              setError("操作失败，请稍后重试");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "处理中…" : "确认清空"}
        </Button>
        <Button
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(undefined);
          }}
        >
          取消
        </Button>
      </div>
    </div>
  );
}
