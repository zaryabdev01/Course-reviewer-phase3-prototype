import { cn } from "@/lib/cn";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-[10px] bg-gray-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="rounded-full bg-gray-200 px-1.5 text-xs text-ink-soft">{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
