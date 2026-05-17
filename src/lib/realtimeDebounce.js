/**
 * createDebouncedRefetch — pure, zero-dependency debounce factory.
 * Exported from its own file so it can be imported by unit tests
 * without pulling in the Supabase client.
 */
export function createDebouncedRefetch(fn, ms = 500, minIntervalMs = 2000) {
  let timer = null;
  let lastCallAt = 0;
  return function trigger() {
    if (timer) clearTimeout(timer);
    const now = Date.now();
    const sinceLast = now - lastCallAt;
    const delay = sinceLast >= minIntervalMs ? ms : Math.max(ms, minIntervalMs - sinceLast);
    timer = setTimeout(() => {
      lastCallAt = Date.now();
      timer = null;
      try {
        fn();
      } catch (e) {
        console.error("[realtimeDebounce] refetch threw:", e);
      }
    }, delay);
  };
}
