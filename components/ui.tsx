"use client";

/**
 * 通用 UI 基元。
 *
 * 集中在一处的原因：这些元素的样式需要在多个页面保持一致
 * （输入框高度、按钮圆角、卡片边框）。分散在各页面里手写，
 * 改一次设计就要改十几处，必然会漏。
 */
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* ── 卡片 ───────────────────────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-faint">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ── 按钮 ───────────────────────────────────────────── */

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export const buttonStyles = {
  primary: `${buttonBase} border-brand bg-brand text-white hover:opacity-90`,
  secondary: `${buttonBase} border-border bg-surface hover:bg-background`,
  ghost: `${buttonBase} border-transparent text-muted hover:bg-background hover:text-text`,
  danger: `${buttonBase} border-danger/40 bg-surface text-danger hover:bg-danger/10`,
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <button
      {...props}
      className={`${buttonStyles[variant]} ${className}`}
    />
  );
}

/**
 * 表单提交按钮。
 *
 * 用 useFormStatus 而不是把 pending 状态从父组件传下来：
 * 它直接读取最近的 <form> 提交状态，因此按钮可以是一个纯展示组件，
 * 无论放在表单的哪一层都能正确工作，也不会因为多包一层而失效。
 */
export function SubmitButton({
  children,
  pendingText = "处理中…",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${buttonStyles[variant]} ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/* ── 表单控件 ───────────────────────────────────────── */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors placeholder:text-faint focus:border-brand";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlBase} ${className}`} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlBase} ${className}`} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlBase} ${className}`} />;
}

/* ── 反馈 ───────────────────────────────────────────── */

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/8 px-3 py-2.5 text-[12.5px] text-danger"
    >
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <div className="text-3xl" aria-hidden>
        🗒️
      </div>
      <div>
        <p className="text-[14px] font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-[12.5px] text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** 分类色块图标，列表与图例共用，保证同分类在各处颜色一致。 */
export function CategoryBadge({
  icon,
  color,
  size = 26,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
      }}
      aria-hidden
    >
      {icon}
    </span>
  );
}
