import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/m3e/cn"

/*
 * M3 Expressive linear progress indicator (Compose LinearProgressIndicator
 * tokens, rendering after matraic/m3e):
 *   flat  — 4dp active track, 4dp gap, secondary-container track, 4dp stop
 *   wavy  — the active track is a travelling sine wave (amplitude 3dp,
 *           wavelength 40dp; 20dp while indeterminate)
 * `value={null}` is indeterminate: two bars chase each other.
 */
const THICKNESS = 4
const AMPLITUDE = 3
const INDETERMINATE_WAVELENGTH = 20

type Variant = "flat" | "outline" | "filled" | "wavy"

/* Material's bars are 4dp; the track takes any thickness and the wavy
 * amplitude scales with it. */
const trackThickness = (thickness?: number) =>
  Math.max(1, Math.round(thickness ?? THICKNESS))

/** a sine wave of quadratic segments, starting at x = 0 */
export function wavePath(
  width: number,
  wavelength: number,
  amplitude: number,
  stroke: number
) {
  const a = amplitude
  const y = a + stroke / 2
  const step = wavelength / 2
  let d = `M 0,${y}`
  for (let x = 0; x <= width + wavelength; x += step) {
    const cx = x + step / 2
    const cy = y + a * Math.sin((2 * Math.PI * cx) / wavelength) * 2
    d += ` Q ${cx},${cy} ${x + step},${y}`
  }
  return d
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

function Progress({
  className,
  children,
  value,
  max = 100,
  variant = "filled",
  thickness,
  showValue = true,
  ...props
}: ProgressPrimitive.Root.Props & {
  variant?: Variant
  thickness?: number
  showValue?: boolean
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      data-slot="progress"
      data-variant={variant}
      className={cn("group/progress flex flex-wrap gap-x-3 gap-y-2", className)}
      {...props}
    >
      {children}
      <ProgressTrack
        variant={variant}
        value={value}
        max={max}
        thickness={thickness}
        showValue={showValue}
      />
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({
  className,
  variant = "filled",
  value,
  max = 100,
  thickness,
  showValue = true,
  ...props
}: ProgressPrimitive.Track.Props & {
  variant?: Variant
  value?: number | null
  max?: number
  /** track height in px (the wave scales with it) */
  thickness?: number
  showValue?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const width = useWidth(ref)
  const wavy = variant === "wavy"
  const t = trackThickness(thickness)
  const amplitude = AMPLITUDE * (t / THICKNESS)
  const height = wavy ? t + amplitude * 2 : t
  const indeterminate = value == null
  const fraction = indeterminate ? 0 : Math.min(1, Math.max(0, value / max))
  const maskId = React.useId()

  return (
    <ProgressPrimitive.Track
      ref={ref}
      data-slot="progress-track"
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height }}
      {...props}
    >
      {indeterminate ? (
        wavy ? (
          <svg width={width} height={height} className="block" aria-hidden>
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse">
                <rect height={height} fill="white" />
                <rect height={height} fill="white" />
              </mask>
            </defs>
            <rect y={(height - t) / 2} width={width} height={t} rx={t / 2} />
            <path
              d={wavePath(width, INDETERMINATE_WAVELENGTH, amplitude, t)}
              mask={`url(#${CSS.escape(maskId)})`}
              className="fill-none stroke-primary"
              strokeWidth={t}
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <div className="relative size-full rounded-full bg-secondary-container">
            <div className="m3-progress-bar-1 absolute inset-y-0 rounded-full bg-primary" />
            <div className="m3-progress-bar-2 absolute inset-y-0 rounded-full bg-primary" />
          </div>
        )
      ) : (
        <div className="flex size-full items-center">
          {showValue && fraction > 0 && (
            <span className="ml-auto text-label-large text-on-surface-variant">
              {Math.round(fraction * 100)}%
            </span>
          )}

          {variant === "outline" ? (
            // Outline: primary border with secondary fill
            <div
              className="relative h-full shrink-0 overflow-hidden rounded-full"
              style={{ width: `${fraction * 100}%` }}
            >
              <div
                className="absolute inset-0 rounded-full bg-secondary-container"
                style={{ height: t }}
              />
              <div
                className="absolute inset-0 rounded-full bg-primary"
                style={{ width: `${fraction * 100}%`, height: t }}
              />
            </div>
          ) : variant === "wavy" && fraction < 1 ? (
            // Wavy determinate
            <div
              className="relative h-full shrink-0 overflow-hidden rounded-full"
              style={{ width: `${fraction * 100}%` }}
            >
              {fraction > 0 && (
                <div
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-primary"
                  style={{ height: t }}
                />
              )}
              {fraction < 1 && (
                <div
                  className="absolute inset-0 rounded-full bg-secondary-container"
                  style={{ height: t }}
                />
              )}
            </div>
          ) : (
            // Default filled determinate
            <div
              className="relative h-full shrink-0 overflow-hidden rounded-full"
              style={{ width: `${fraction * 100}%` }}
            >
              {fraction > 0 && (
                <div
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-primary"
                  style={{ height: t }}
                />
              )}
              {fraction < 1 && (
                <div
                  className="shrink-0 rounded-full bg-secondary-container"
                  style={{ height: t }}
                />
              )}
              <div
                className="shrink-0 rounded-full bg-primary"
                style={{ width: t, height: t }}
              />
            </div>
          )}
        </div>
      )}
    </ProgressPrimitive.Track>
  )
}

/** kept for API compatibility with shadcn; the track draws everything */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("hidden", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-label-large text-on-surface", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-label-large text-on-surface-variant tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
