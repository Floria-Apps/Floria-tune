import { Button } from "./m3e/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./m3e/empty";
import { Icon } from "./m3e/icon";
import { LoadingIndicator } from "./m3e/loading-indicator";
import { Skeleton } from "./m3e/skeleton";
import { useTranslation } from "../lib/i18n";

interface ErrorPanelProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

function ErrorPanelInner({
  title,
  message,
  onRetry,
  t,
}: ErrorPanelProps & { t: ReturnType<typeof useTranslation> }) {
  return (
    <Empty className="mx-auto my-12 max-w-[38rem] border-none p-8 max-[760px]:my-8 max-[760px]:p-6" role="alert">
      <EmptyMedia
        variant="icon"
        className="size-14 bg-error-container text-on-error-container"
      >
        <Icon name="error" size={28} />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-body-small text-on-surface-variant">
          {t.connection.backendError}
        </p>
        {onRetry && (
          <Button variant="tonal" size="sm" onClick={onRetry}>
            <Icon name="refresh" data-icon="inline-start" />
            {t.common.retry}
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}

export function ErrorPanel({
  title = "",
  message,
  onRetry,
}: ErrorPanelProps) {
  const t = useTranslation();
  return <ErrorPanelInner title={title || t.common.notFound} message={message} onRetry={onRetry} t={t} />;
}

interface EmptyPanelProps {
  title: string;
  message: string;
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
}

function EmptyPanelInner({
  title,
  message,
  icon = "music_off",
  actionLabel,
  actionHref,
}: EmptyPanelProps) {
  return (
    <Empty className="mx-auto my-12 max-w-[36rem] border-none p-8 max-[760px]:my-8 max-[760px]:p-6">
      <EmptyMedia
        variant="icon"
        className="size-14 bg-primary-container text-on-primary-container"
      >
        <Icon name={icon} size={28} />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {actionLabel && actionHref && (
        <EmptyContent>
          <Button
            variant="tonal"
            size="sm"
            nativeButton={false}
            render={<a href={actionHref} />}
          >
            {actionLabel}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

export function EmptyPanel({
  title,
  message,
  icon = "music_off",
  actionLabel,
  actionHref,
}: EmptyPanelProps) {
  return (
    <EmptyPanelInner
      title={title}
      message={message}
      icon={icon}
      actionLabel={actionLabel}
      actionHref={actionHref}
    />
  );
}

function LoadingPanelInner({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center gap-4 py-16 text-on-surface-variant"
      aria-busy="true"
    >
      <LoadingIndicator size={48} />
      <p className="text-body-medium">{label}</p>
    </div>
  );
}

export function LoadingPanel({ label }: { label?: string }) {
  const t = useTranslation();
  return <LoadingPanelInner label={label || t.common.loading} />;
}

function LoadingRowsInner({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div
      className="flex flex-col gap-1 py-2"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex items-center gap-4 px-3 py-2.5" key={index}>
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <span className="flex-1 space-y-2">
            <Skeleton className="block h-3 w-1/3 rounded-sm" />
            <Skeleton className="block h-3 w-1/5 rounded-sm" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  const t = useTranslation();
  return <LoadingRowsInner rows={rows} label={t.common.loading} />;
}

function LoadingGridInner({ items = 8, label }: { items?: number; label: string }) {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-8"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: items }, (_, index) => (
        <div key={index}>
          <Skeleton className="block aspect-square w-full rounded-md" />
          <Skeleton className="mt-3 block h-3 w-4/5 rounded-sm" />
          <Skeleton className="mt-2 block h-3 w-1/2 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export function LoadingGrid({ items = 8 }: { items?: number }) {
  const t = useTranslation();
  return <LoadingGridInner items={items} label={t.common.loading} />;
}