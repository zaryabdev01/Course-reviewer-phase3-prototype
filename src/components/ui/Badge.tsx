import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-gray-100 text-gray-700",
  brand: "bg-primary-50 text-primary-700",
  success: "bg-success-soft text-[color:var(--color-success-600,#079455)]",
  warning: "bg-warning-soft text-warning-dark",
  danger: "bg-danger-soft text-[color:#b42318]",
  info: "bg-info-soft text-primary-700",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
