import Link from "next/link";

export function QueuePagination({ page, hasNextPage, hrefForPage }: { page: number; hasNextPage: boolean; hrefForPage: (page: number) => string }) {
  if (page === 0 && !hasNextPage) return null;

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Queue pages">
      {page > 0 ? <Link className="font-bold underline underline-offset-4" href={hrefForPage(page - 1)}>Previous page</Link> : <span />}
      <p className="text-sm text-slate-600">Page {page + 1}. Each page shows up to 100 items.</p>
      {hasNextPage ? <Link className="font-bold underline underline-offset-4" href={hrefForPage(page + 1)}>Next page</Link> : <span />}
    </nav>
  );
}
