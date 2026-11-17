import React, { forwardRef, useId } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether this segment is selected */
  selected?: boolean;
  /** Segment value for identification */
  value?: string;
  /** Accessible label */
  label?: string;
  /** Icon name (optional) */
  icon?: string;
  /** Click handler */
  onClick?: () => void;
}

const SegmentedButton = forwardRef<HTMLButtonElement, SegmentedButtonProps>(
  (
    {
      selected = false,
      value,
      label,
      icon,
      disabled = false,
      className = "",
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const id = useId();
    const ariaLabel: string | undefined =
      typeof label === "string" ? label : typeof children === "string" ? children : undefined;

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        role={value ? "radio" : "button"}
        aria-pressed={selected}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "text-label-large font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:opacity-40 disabled:pointer-events-none",
          "whitespace-nowrap",
          selected
            ? "bg-primary text-on-primary shadow-sm"
            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
          className,
        )}
        onClick={onClick}
        {...props}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {children}
      </button>
    );
  },
);

SegmentedButton.displayName = "SegmentedButton";

interface SegmentedButtonGroupProps {
  /** Selected value */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Children (SegmentedButton components) */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

function SegmentedButtonGroup({
  value,
  onChange,
  orientation = "horizontal",
  children,
  className = "",
}: SegmentedButtonGroupProps) {
  const segments = React.Children.toArray(children).map((child, index) => {
    if (!React.isValidElement(child)) return child;

    const childValue = (child.props as Record<string, unknown>).value as string | undefined ?? `segment-${index}`;
    const isSelected = value === childValue;
    const originalOnClick = (child.props as Record<string, unknown>).onClick as (() => void) | undefined;

    const handleClick = () => {
      originalOnClick?.();
      if (!isSelected && onChange) {
        onChange(childValue);
      }
    };

    return React.cloneElement(child as React.ReactElement<{ selected?: boolean; onClick?: () => void }>, {
      selected: isSelected,
      onClick: handleClick,
    });
  });

  return (
    <div
      role="radiogroup"
      aria-orientation={orientation}
      className={cn(
        "inline-flex gap-1 p-0.5 rounded-full bg-surface-container-highest",
        orientation === "vertical" && "flex-col",
        className,
      )}
    >
      {segments}
    </div>
  );
}

export { SegmentedButton, SegmentedButtonGroup };