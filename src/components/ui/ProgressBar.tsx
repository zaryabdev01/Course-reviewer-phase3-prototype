import { cn } from "@/lib/cn";

export function ProgressBar({ percent, className, tone = "brand" }: { percent: number; className?: string; tone?: "brand" | "success" | "warning" }) {
  const color = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary-300";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-200", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
