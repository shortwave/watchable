import { MapLike, MapFactory, defaultMapFactory } from './utils';
import { Watchable, WatchableSubject } from './watchable';

/*
 * A map of watchable values that allows for managing many individual subscriptions.
 *
 * For example, if you have a set of contacts you want to be able to watch, you can use
 * this class to track them by email or ID.
 *
 * If you want to combine individual watchables into a single one, see the
 * `partialCombineWatchable` function in ./watchable.ts
 *
 */
export class WatchableMap<K, V> {
  private readonly underlying: MapLike<K, WatchableSubject<V>>;

  constructor(
    private equalityFn: (a: V, b: V) => boolean = (a, b) => a === b,
    mapMaker: MapFactory<K, WatchableSubject<V>> = defaultMapFactory
  ) {
    this.underlying = mapMaker();
  }

  keys(): IterableIterator<K> {
    return this.underlying.keys();
  }

  getOrCreate(key: K): Watchable<V> {
    return this.getOrCreateSubject(key);
  }

  getIfExists(key: K): Watchable<V> | null {
    return this.underlying.get(key) ?? null;
  }

  getOrCreateWithValue(key: K, defaultValue: V): Watchable<V> {
    const subject = this.getOrCreateSubject(key);
    if (!subject.hasValue()) {
      subject.update(defaultValue);
    }
    return subject;
  }

  updateOrCreate(key: K, value: (v?: V) => V): void {
    const subject = this.getOrCreateSubject(key);
    if (subject.hasValue()) {
      const current = subject.getValue();
      const update = value(current);
      if (!this.equalityFn(current, update)) {
        subject.update(update);
      }
    } else {
      subject.update(value());
    }
  }
  updateIfMissing(key: K, value: V): void {
    const subject = this.getOrCreateSubject(key);
    if (!subject.hasValue()) {
      subject.update(value);
    }
  }

  updateOrCreateWithValue(key: K, value: V): void {
    const subject = this.getOrCreateSubject(key);
    if (!subject.hasValue() || !this.equalityFn(subject.getValue(), value)) {
      subject.update(value);
    }
  }

  updateIfExists(key: K, updateFn: (old?: V) => V): void {
    const subject = this.underlying.get(key);
    if (subject) {
      const newValue = subject.hasValue()
        ? updateFn(subject.getValue())
        : updateFn();
      subject.update(newValue);
    }
  }

  [Symbol.iterator](): IterableIterator<[K, WatchableSubject<V>]> {
    return this.underlying[Symbol.iterator]();
  }

  private getOrCreateSubject(key: K): WatchableSubject<V> {
    const existing = this.underlying.get(key);
    if (existing) return existing;
    const newSubject = WatchableSubject.empty<V>();
    this.underlying.set(key, newSubject);
    return newSubject;
  }
}
