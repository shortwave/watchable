import { DependencyList, useEffect, useMemo, useState } from 'react';

import { Watchable } from './watchable';

/*
 * A combination of useMemo and useWatchable for simple usage.
 *
 * It's suggested that this is listed as a custom hook for eslint's react-hooks plugin.
 *  Learn more: https://www.npmjs.com/package/eslint-plugin-react-hooks#user-content-advanced-configuration
 */
export function useMemoizedWatchable<T>(
  w: () => Watchable<T>,
  deps: DependencyList
): T | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useWatchable(useMemo(w, deps));
}

/*
 * A hook to extract a value from a watchable. If the watchable is empty than `null` is emitted.
 */
export function useWatchable<T>(w: Watchable<T>): T | null {
  return useExplicitWatchable(null, w);
}

/*
 * Similar to `useWatchable` except that it allows the loading value to be customized.
 */
export function useExplicitWatchable<D, T>(loading: D, w: Watchable<T>): D | T {
  const [value, setValue] = useState<D | T>(
    w.hasValue() ? w.getValue() : loading
  );
  useEffect(() => w.watch(setValue), [w]);
  return value;
}
