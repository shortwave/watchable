import { Subscriptions, Unsubscribe, Box, memoizeLatest } from './utils';

export type WatcherFn<T> = (value: T) => void;

interface WatchableLike<T> {
  /** If this watchable has a current value. */
  hasValue(): boolean;
  /** Get the current value for this watchable, requires `hasValue` returns true. */
  getValue(): T;

  /** Watch this for updates. The current value will be replayed here. */
  watch(watch: WatcherFn<T>): Unsubscribe;
}

export abstract class Watchable<T> implements WatchableLike<T> {
  abstract hasValue(): boolean;
  abstract getValue(): T;
  getOrDefault<V>(defaultValue: V): T | V {
    return this.hasValue() ? this.getValue() : defaultValue;
  }

  abstract watch(watcher: WatcherFn<T>): Unsubscribe;

  /* Transform this state into another value. There is basic memoization here on references. */
  map<U>(mapper: (t: T) => U): Watchable<U> {
    // Keep a memoized version if mapper is expensive, we also want to
    // keep reference equality between getValue calls.
    const memoizedMapper = memoizeLatest(mapper);
    return new DerivedWatchable<U>({
      hasValue: () => this.hasValue(),
      getValue: () => memoizedMapper(this.getValue()),
      watch: (watcher) => this.watch((v) => watcher(memoizedMapper(v))),
    });
  }

  /*
   * Returns a watchable that allows for callbacks when the first subscription is setup
   * and the last watcher is torn down.
   *
   * Useful for tracking usage of a watchable or needing side effects when updates come in.
   */
  withHooks({
    setup,
    tearDown,
  }: {
    setup(): void;
    tearDown(): void;
  }): Watchable<T> {
    let count = 0;
    return new DerivedWatchable({
      hasValue: () => this.hasValue(),
      getValue: () => this.getValue(),
      watch: (watch: WatcherFn<T>) => {
        const isFirst = count === 0;
        count++;
        const unsub = this.watch(watch);
        if (isFirst) {
          setup();
        }
        return () => {
          unsub();
          count--;
          if (count === 0) {
            tearDown();
          }
        };
      },
    });
  }

  /* Convert the watchable into a promise that resolves when the watchable is not empty. */
  toPromise(): Promise<T> {
    return new Promise((resolve) => {
      let resolved = false;
      let unsub: Unsubscribe | null = null;
      unsub = this.watch((v) => {
        resolve(v);
        // If unsub is unset then this watch fired synchronously and we just flag that
        // this happened, otherwise we need to unsub async when the watch finally resolves.
        if (unsub) {
          unsub();
        } else {
          resolved = true;
        }
      });
      if (resolved) unsub();
    });
  }

  /** Returns either the current value as a watchable or a watchable that is empty and only updates once. */
  snapshot(): Watchable<T> {
    if (this.hasValue()) {
      return WatchableSubject.of(this.getValue());
    }
    const delayed = WatchableSubject.empty<T>();
    this.toPromise().then((v) => delayed.update(v));
    return delayed;
  }
}

class DerivedWatchable<T> extends Watchable<T> {
  constructor(private readonly source: WatchableLike<T>) {
    super();
  }

  hasValue(): boolean {
    return this.source.hasValue();
  }

  getValue(): T {
    return this.source.getValue();
  }

  watch(watcher: WatcherFn<T>): Unsubscribe {
    return this.source.watch(watcher);
  }
}

class EmptyWatchableError extends Error {
  constructor() {
    super('You must check hasValue() before accessing a watchable value.');
  }
}

/** The mutable version of a watchable. */
export class WatchableSubject<T> extends Watchable<T> {
  private readonly subscriptions = new Subscriptions<WatcherFn<T>>();

  private currentValue: Box<T> | null = null;

  private constructor(currentValue: Box<T> | null) {
    super();
    this.currentValue = currentValue;
  }

  hasValue(): boolean {
    return this.currentValue !== null;
  }

  getValue(): T {
    if (!this.currentValue) {
      throw new EmptyWatchableError();
    }
    return this.currentValue.current;
  }

  static empty<T>() {
    return new WatchableSubject<T>(null);
  }

  static of<T>(value: T) {
    return new WatchableSubject<T>({ current: value });
  }

  /* Update the current value for this "watchable". Does memoization on references. */
  update(elem: T): void {
    if (this.currentValue && this.currentValue.current === elem) return;
    this.currentValue = { current: elem };
    for (const sub of this.subscriptions) {
      sub(elem);
    }
  }

  watch(watch: WatcherFn<T>): Unsubscribe {
    const unsub = this.subscriptions.add(watch);
    // Fire off the initial value synchronously.
    if (this.hasValue()) watch(this.getValue());
    return unsub;
  }
}

/*
 * Combines a map from keys to watchables, and omits any watchables that don't have a value defined in the result.
 */
export function partialCombineWatchable<K, V>(
  map: ReadonlyMap<K, Watchable<V>>
): Watchable<Map<K, V>> {
  if (map.size === 0) {
    return WatchableSubject.of(new Map());
  }

  const subject = WatchableSubject.empty<Map<K, V>>();

  // Make a copy in case someone mutates the map
  const mapCopy = new Map(map);

  const calculateLatest = () => {
    const latest = new Map<K, V>();
    mapCopy.forEach((watchable, key) => {
      if (watchable.hasValue()) {
        latest.set(key, watchable.getValue());
      }
    });
    return latest;
  };

  const updateLatest = () => {
    const latest = calculateLatest();
    const previous = subject.getOrDefault(new Map<K, V>());
    for (const [key, value] of latest.entries()) {
      if (previous.get(key) !== value) {
        subject.update(latest);
        return;
      }
    }
    // Note, there can never be missing keys since a watchable can never go from having a value to not having a value.
    return;
  };

  const startWatching = (watch: WatcherFn<Map<K, V>>) => {
    const unsubscribes: Unsubscribe[] = [];

    // started is set to false during subscribing, so we don't update the map on the start of
    // every watchable, which has O(N^2) behavior. Instead we wait until all subscriptions have started
    // and *then* calculate the map at the end once.
    let started = false;
    mapCopy.forEach((watchable) => {
      unsubscribes.push(
        watchable.watch(() => {
          if (!started) return;
          updateLatest();
        })
      );
    });
    started = true;
    const unsubscribeSubject = subject.watch(watch);

    return () => {
      unsubscribeSubject();
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  };

  updateLatest();

  return new DerivedWatchable({
    hasValue: () => subject.hasValue(),
    getValue: () => subject.getValue(),
    watch: (watch: WatcherFn<Map<K, V>>) => startWatching(watch),
  });
}
