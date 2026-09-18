/**
 * Fake network layer. Every function here resolves after a simulated
 * delay, so loading states, skeletons and TanStack Query's isLoading are
 * exercised for real — not just always-instant mock objects. When the
 * real backend lands, only the *implementation* of the functions in this
 * `lib/api/*` folder changes (axios/fetch calls instead of `db` reads);
 * every hook and component that calls them is untouched because they all
 * go through this one layer. No file outside `lib/api` and `mocks/` may
 * import from `mocks/db`.
 */
export function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
