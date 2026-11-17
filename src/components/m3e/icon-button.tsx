import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon name from the icon registry */
  icon: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Visual variant */
  variant?: "filled" | "tonal" | "outlined" | "text" | "elevated";
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Fill behavior */
  fill?: "auto" | "fixed";
  /** Accessible label (required for icon-only buttons) */
  label: string;
  /** Click handler */
  onClick?: () => void;
}

const SIZE_CLASSES = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const SIZE_ICON = {
  sm: 18,
  md: 24,
  lg: 28,
};

const VARIANT_CLASSES = {
  filled: "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80",
  tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 active:bg-secondary-container/80",
  outlined: "border border-outline bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20",
  text: "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20",
  elevated: "bg-shadow text-on-shadow shadow-lg hover:shadow-xl active:shadow-md",
};

const FILL_CLASSES = {
  auto: "flex-1",
  fixed: "",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      size = "md",
      variant = "filled",
      disabled = false,
      fill = "auto",
      label,
      className = "",
      onClick,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:opacity-40 disabled:pointer-events-none",
          "active:scale-[0.95]",
          SIZE_CLASSES[size],
          VARIANT_CLASSES[variant],
          FILL_CLASSES[fill],
          className,
        )}
        onClick={onClick}
        {...props}
      >
        <Icon name={icon} size={SIZE_ICON[size]} aria-hidden="true" />
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton };