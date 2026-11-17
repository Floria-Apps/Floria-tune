import { Button } from "./m3e/button";
import { Icon } from "./m3e/icon";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "./m3e/pagination";

interface PagerProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

type PageCell = number | "ellipsis";

/** First and last page, plus the pages around the current one. */
function pageWindow(current: number, count: number): PageCell[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const cells: PageCell[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);

  if (start > 2) {
    cells.push("ellipsis");
  }

  for (let value = start; value <= end; value += 1) {
    cells.push(value);
  }

  if (end < count - 1) {
    cells.push("ellipsis");
  }

  cells.push(count);

  return cells;
}

export function Pager({ page, limit, total, onChange }: PagerProps) {
  if (total <= limit) {
    return null;
  }

  const count = Math.ceil(total / limit);
  const pages = pageWindow(page, count);

  return (
    <Pagination className="pt-8" aria-label="Paginação">
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="text"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="Página anterior"
          >
            <Icon name="chevron_left" />
          </Button>
        </PaginationItem>

        {pages.map((cell, index) =>
          cell === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={cell}>
              <Button
                variant={cell === page ? "tonal" : "text"}
                size="icon-sm"
                onClick={() => {
                  if (cell !== page) {
                    onChange(cell);
                  }
                }}
                aria-label={`Página ${cell}`}
                aria-current={cell === page ? "page" : undefined}
              >
                {cell}
              </Button>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <Button
            variant="text"
            size="icon-sm"
            disabled={page >= count}
            onClick={() => onChange(page + 1)}
            aria-label="Próxima página"
          >
            <Icon name="chevron_right" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
