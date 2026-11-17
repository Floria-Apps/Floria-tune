import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/m3e/cn"

import { Icon } from "@/components/m3e/icon"
import { Ripple } from "@/components/m3e/ripple"

/*
 * M3 Expressive chip (Compose Chip tokens).
 *
 *   assist — small label chip (e.g. genre)
 *   filter — toggles, with optional leading icon
 *   input  — removable, trailing close icon
 *
 * All variants have a state layer on hover/press.
 */
const chipVariants = cva(
  "group/chip relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-sm border border-transparent px-3 text-label-large whitespace-nowrap transition-colors focus-ring outline-none select-none disabled:pointer-events-none disabled:cursor-default disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        assist: "bg-surface-container-high text-on-surface-variant",
        filter: "bg-surface-container-highest text-on-surface-variant",
        input: "bg-surface-container-low text-on-surface-variant",
        filter_outline: "border-outline-variant bg-transparent text-on-surface-variant",
      },
      selected: {
        true: "bg-primary text-on-primary",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "filter", selected: true, className: "bg-primary text-on-primary" },
      { variant: "filter_outline", selected: true, className: "border-primary bg-transparent text-primary" },
    ],
    defaultVariants: {
      variant: "assist",
      selected: false,
    },
  }
)

interface ChipProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof chipVariants> {
  /** Leading icon (Material Symbols name or node) */
  icon?: React.ReactNode | string
  /** Trailing close button (removes the chip) */
  removable?: boolean
  /** Called when the trailing close is clicked */
  onRemove?: (event: React.MouseEvent) => void
  /** Selected state (filter chips) */
  selected?: boolean
  /** Disable the chip */
  disabled?: boolean
}

function Chip({
  className,
  variant = "assist",
  selected,
  removable,
  icon,
  onRemove,
  disabled,
  children,
  ...props
}: ChipProps) {
  const leadingIcon =
    typeof icon === "string" ? (
      <Icon name={icon} size={18} className="text-on-surface-variant" />
    ) : icon ? (
      <span className="text-on-surface-variant">{icon}</span>
    ) : null

  const trailingIcon = removable ? (
    <button
      type="button"
      aria-label="Remover"
      disabled={disabled}
      className="flex items-center justify-center rounded-full p-0.5 hover:bg-on-surface/10"
      onClick={(e) => {
        e.stopPropagation()
        onRemove?.(e)
      }}
    >
      <Icon name="close" size={16} />
    </button>
  ) : null

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        disabled,
        "aria-pressed": selected,
        className: cn(chipVariants({ variant, selected }), className),
        children: (
          <>
            <Ripple disabled={disabled} />
            {leadingIcon && (
              <span data-slot="chip-icon" className="relative z-1">
                {leadingIcon}
              </span>
            )}
            <span className="relative z-1 truncate">{children}</span>
            {trailingIcon}
          </>
        ),
      },
      props
    ),
    render: props.render,
    state: { slot: "chip", variant, selected: !!selected, disabled: !!disabled },
  })
}

export { Chip, chipVariants }
export type { ChipProps }
