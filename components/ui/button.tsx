import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "dark" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { base: string; shadow: string }> = {
  primary: {
    base: "bg-coo-yellow text-coo-black border-coo-black",
    shadow: "4px 4px 0 #0A0A0A",
  },
  dark: {
    base: "bg-coo-black text-coo-yellow border-coo-black",
    shadow: "4px 4px 0 #FFD800",
  },
  danger: {
    base: "bg-coo-red text-white border-coo-black",
    shadow: "4px 4px 0 #0A0A0A",
  },
  ghost: {
    base: "bg-transparent text-coo-black border-coo-black",
    shadow: "4px 4px 0 #0A0A0A",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-2",
  md: "text-sm px-4 py-3",
  lg: "text-base px-6 py-4",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { base, shadow } = variantStyles[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "font-archivo border-2",
          "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
          "transition-all duration-75 cursor-pointer select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0",
          base,
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        style={{
          boxShadow: isDisabled ? "none" : shadow,
          ...style,
        }}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
