import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "panel" | "subtle";

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  variant?: CardVariant;
  interactive?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  panel: "bg-midnight-panel border border-midnight-border",
  subtle: "bg-midnight-surface/60 border border-white/5",
};

/**
 * Standard container surface card for Midnight layouts.
 */
export function Card({
  variant = "panel",
  interactive = false,
  className = "",
  children,
  onClick,
  ...props
}: CardProps) {
  const interactiveStyles = interactive
    ? "cursor-pointer transition-all duration-200 hover:border-midnight-accent/30 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
    : "";

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`rounded-2xl p-4 text-midnight-text ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}