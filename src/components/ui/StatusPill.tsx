import { cn } from "@/lib/cn";
import { MATRIX_STATUS_LABELS, type MatrixStatus } from "@/contracts";

const STYLES: Record<MatrixStatus, string> = {
  not_required: "bg-[var(--color-matrix-not-required)] text-[var(--color-matrix-not-required-text)]",
  required: "bg-[var(--color-matrix-required)] text-[var(--color-matrix-required-text)]",
  allocated: "bg-[var(--color-matrix-allocated)] text-[var(--color-matrix-allocated-text)]",
  in_progress: "bg-[var(--color-matrix-in-progress)] text-[var(--color-matrix-in-progress-text)]",
  completed: "bg-[var(--color-matrix-completed)] text-[var(--color-matrix-completed-text)]",
  renewal_due: "bg-[var(--color-matrix-renewal-due)] text-[var(--color-matrix-renewal-due-text)]",
  overdue: "bg-[var(--color-matrix-overdue)] text-[var(--color-matrix-overdue-text)]",
};

export function StatusPill({ status, className }: { status: MatrixStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      {MATRIX_STATUS_LABELS[status]}
    </span>
  );
}

const DOT_STYLES: Record<MatrixStatus, string> = {
  not_required: "bg-[var(--color-matrix-not-required-dot)]",
  required: "bg-[var(--color-matrix-required-dot)]",
  allocated: "bg-[var(--color-matrix-allocated-dot)]",
  in_progress: "bg-[var(--color-matrix-in-progress-dot)]",
  completed: "bg-[var(--color-matrix-completed-dot)]",
  renewal_due: "bg-[var(--color-matrix-renewal-due-dot)]",
  overdue: "bg-[var(--color-matrix-overdue-dot)]",
};

export function StatusDot({ status }: { status: MatrixStatus }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT_STYLES[status])}
      title={MATRIX_STATUS_LABELS[status]}
    />
  );
}
