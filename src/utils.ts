export interface Box<T> {
  current: T;
}

export type Unsubscribe = () => void;

export class Subscriptions<CallbackType> {
  private callbacks = new Set<CallbackType>();

  add(fn: CallbackType): Unsubscribe {
    if (this.callbacks.has(fn)) {
      throw new Error("Can't add subscription twice!");
    }
    this.callbacks.add(fn);
    return () => {
      const hadValue = this.callbacks.delete(fn);
      if (!hadValue) {
        throw new Error('Did not find callback function for unsubscribe');
      }
    };
  }

  isEmpty(): boolean {
    return this.callbacks.size === 0;
  }

  forEach(callback: (cb: CallbackType) => void): void {
    // Make a copy to support sync removal.
    return Array.from(this.callbacks).forEach(callback);
  }
}

export function memoizeLatest<Input, Output>(
  fn: (i: Input) => Output
): (i: Input) => Output {
  let latest: { input: Input; output: Output } | null = null;
  return (input) => {
    if (!latest) {
      latest = { input, output: fn(input) };
    } else if (latest.input !== input) {
      latest.input = input;
      latest.output = fn(input);
    }
    return latest.output;
  };
}

export interface MapLike<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(k: K): boolean;
  readonly size: number;
  [Symbol.iterator](): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
}

export type MapFactory<K, V> = () => Map<K, V>;

export function defaultMapFactory<K, V>(): Map<K, V> {
  return new Map();
}
