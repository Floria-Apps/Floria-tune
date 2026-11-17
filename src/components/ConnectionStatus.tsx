export type ConnectionState = "online" | "offline" | "checking";

interface ConnectionStatusProps {
  state: ConnectionState;
  label: string;
  className?: string;
}

const DOT_TONE: Record<ConnectionState, string> = {
  online: "bg-tertiary ring-tertiary/20",
  offline: "bg-error ring-error/20",
  checking: "animate-pulse bg-outline ring-outline/20",
};

/** Small dot + label used by the rail, the top bar and error hints. */
export function ConnectionStatus({
  state,
  label,
  className,
}: ConnectionStatusProps) {
  return (
    <span
      className={[
        "inline-flex min-w-0 items-center gap-1.5 text-label-small text-on-surface-variant",
        className ?? "",
      ].join(" ")}
      title={label}
    >
      <span
        className={`size-2 shrink-0 rounded-full ring-2 ${DOT_TONE[state]}`}
        aria-hidden="true"
      />
      <span className="hidden truncate min-[1081px]:inline">{label}</span>
    </span>
  );
}
