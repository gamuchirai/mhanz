import type { ChangeEvent, InputHTMLAttributes } from "react";

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  icon?: string;
}

/**
 * Standard text input field styled with Midnight theme tokens.
 */
export function TextInput({
  value,
  onChange,
  icon,
  placeholder,
  autoFocus,
  disabled = false,
  className = "",
  ...props
}: TextInputProps) {
  const iconHref = icon ? (icon.startsWith("#") ? icon : `#${icon}`) : null;

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {iconHref && (
        <svg
          className="i w-4 h-4 text-midnight-muted absolute left-3.5 pointer-events-none"
          aria-hidden="true"
        >
          <use href={iconHref} />
        </svg>
      )}
      <input
        type="text"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={`w-full bg-midnight-panel border border-midnight-border rounded-xl text-sm text-midnight-text placeholder:text-midnight-muted transition-colors outline-none focus:border-midnight-accent/50 disabled:opacity-40 disabled:cursor-not-allowed ${iconHref ? "pl-10 pr-3.5 py-2" : "px-3.5 py-2"
          }`}
        {...props}
      />
    </div>
  );
}
