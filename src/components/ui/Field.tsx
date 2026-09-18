import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-ink-soft">{children}</label>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
