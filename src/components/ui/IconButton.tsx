import type { ButtonHTMLAttributes } from "react";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "panel" | "subtle" | "primary";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

const sizeStyles: Record<IconButtonSize, { button: string; icon: string }> = {
  sm: { button: "w-7 h-7 rounded-lg", icon: "w-3.5 h-3.5" },
  md: { button: "w-8 h-8 rounded-xl", icon: "w-4 h-4" },
  lg: { button: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
};

const variantStyles: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-midnight-muted hover:text-midnight-text hover:bg-white/5 active:scale-95",
  panel:
    "bg-midnight-panel border border-midnight-border text-midnight-muted hover:text-midnight-text hover:bg-white/5 active:scale-95",
  subtle:
    "bg-white/5 text-midnight-muted hover:text-midnight-text hover:bg-white/10 active:scale-95",
  primary:
    "bg-midnight-accent text-[#1c0f09] hover:bg-[#f5dec0] active:scale-95 shadow-md",
};

/**
 * Accessible icon button primitive with tooltip title and aria label.
 */
export function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  disabled = false,
  className = "",
  ...props
}: IconButtonProps) {
  if (import.meta.env?.DEV && !label) {
    console.warn("IconButton requires a non empty label for accessibility.");
  }

  const iconHref = icon.startsWith("#") ? icon : `#${icon}`;
  const disabledStyles = disabled
    ? "opacity-40 cursor-not-allowed pointer-events-none active:scale-100"
    : "cursor-pointer";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-grid place-items-center transition-all duration-150 select-none border-0 ${sizeStyles[size].button} ${variantStyles[variant]} ${disabledStyles} ${className}`}
      {...props}
    >
      <svg className={`i ${sizeStyles[size].icon}`} aria-hidden="true">
        <use href={iconHref} />
      </svg>
    </button>
  );
}