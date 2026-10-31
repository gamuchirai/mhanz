import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-midnight-accent text-[#1c0f09] hover:bg-[#f5dec0] active:scale-95 shadow-md font-semibold",
  ghost:
    "bg-transparent text-midnight-muted hover:text-midnight-text hover:bg-white/5 active:scale-95 font-medium",
  outline:
    "bg-transparent border border-midnight-border text-midnight-text hover:bg-white/5 hover:border-midnight-accent/40 active:scale-95 font-medium",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs py-1 px-2.5 rounded-lg gap-1.5",
  md: "text-sm py-2 px-4 rounded-xl gap-2",
  lg: "text-base py-2.5 px-5 rounded-xl gap-2.5",
};

/**
 * Standard interactive button primitive for Midnight design system.
 */
export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const disabledStyles = disabled
    ? "opacity-40 cursor-not-allowed pointer-events-none active:scale-100"
    : "cursor-pointer";

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

