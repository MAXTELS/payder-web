/**
 * Shared loading indicator used everywhere a page or section is waiting on
 * data (an initial fetch on mount, a role check before rendering, a
 * paginated reload, …) instead of rendering nothing and looking stuck/idle.
 * Two shapes:
 *  - <PageLoader /> — fills the whole page area (a full page's initial load,
 *    or a route-level `loading.tsx`).
 *  - <PageLoader inline /> — a smaller version that drops into a card/section
 *    without taking over the whole viewport (e.g. a list refreshing under an
 *    already-visible header/toolbar).
 */
export function PageLoader({
  label = 'Loading…',
  inline = false,
}: {
  label?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={
        inline
          ? 'flex flex-col items-center justify-center gap-3 py-12 text-center'
          : 'flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-center'
      }
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
