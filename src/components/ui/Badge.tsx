import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "accent" | "neutral" | "subtle";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent:
    "bg-midnight-accent/15 text-midnight-accent border border-midnight-accent/30",
  neutral:
    "bg-white/10 text-midnight-text border border-white/10",
  subtle:
    "bg-midnight-panel text-midnight-muted border border-midnight-border",
};

/**
 * Small pill badge for tags, statuses, and metadata chips.
 */
export function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

