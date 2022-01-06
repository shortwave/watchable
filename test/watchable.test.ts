import {
  Watchable,
  WatchableSubject,
  partialCombineWatchable,
} from '../src/watchable';

describe('Watchable', () => {
  test('can get value synchronously', () => {
    const w = WatchableSubject.empty<number>();
    expect(w.hasValue()).toBeFalsy();
    w.update(4);
    expect(w.hasValue()).toBeTruthy();
    expect(w.getValue()).toEqual(4);
    w.update(5);
    expect(w.hasValue()).toBeTruthy();
    expect(w.getValue()).toEqual(5);
  });
  test('can be watched', () => {
    const w = WatchableSubject.empty<number>();
    const observed: number[] = [];
    const unsub = w.watch((v) => observed.push(v));
    expect(observed).toStrictEqual([]);
    w.update(4);
    expect(observed).toStrictEqual([4]);
    w.update(5);
    expect(observed).toStrictEqual([4, 5]);
    unsub();
    w.update(6);
    expect(observed).toStrictEqual([4, 5]);
  });
  test('watch fires sync', () => {
    const w = WatchableSubject.of(1);
    const observed: number[] = [];
    w.watch((v) => observed.push(v));
    expect(observed).toStrictEqual([1]);
  });
  test('map', () => {
    const w = WatchableSubject.empty<number>();
    const m = w.map((v) => v.toString());
    expect(m.hasValue()).toBeFalsy();
    w.update(1);
    expect(m.hasValue()).toBeTruthy();
    expect(m.getValue()).toStrictEqual('1');
    const observed: string[] = [];
    m.watch((v) => observed.push(v));
    expect(observed).toStrictEqual(['1']);
    w.update(2);
    expect(observed).toStrictEqual(['1', '2']);
  });
  test('watch can multiplex', () => {
    const numbers: number[] = [];
    const strings: string[] = [];
    const arrays: number[][] = [];
    const objects: Array<Record<number, boolean>> = [];

    const w = WatchableSubject.empty<number>();

    w.watch((v) => numbers.push(v));
    w.watch((v) => numbers.push(v));
    w.watch((v) => numbers.push(v));

    w.update(1);

    expect(numbers).toStrictEqual([1, 1, 1]);

    const m1 = w.map((v) => v.toString());
    expect(m1.hasValue()).toBeTruthy();
    expect(m1.getValue()).toStrictEqual('1');
    m1.watch((v) => strings.push(v));
    m1.watch((v) => strings.push(v));
    m1.watch((v) => strings.push(v));
    expect(strings).toStrictEqual(['1', '1', '1']);

    const m2 = w.map((v) => [v]);
    expect(m2.hasValue()).toBeTruthy();
    expect(m2.getValue()).toStrictEqual([1]);
    m2.watch((v) => arrays.push(v));
    expect(arrays).toStrictEqual([[1]]);

    const m3 = w.map((v) => ({ [v]: true }));
    expect(m3.hasValue()).toBeTruthy();
    expect(m3.getValue()).toStrictEqual({ 1: true });
    m3.watch((v) => objects.push(v));
    expect(objects).toStrictEqual([{ 1: true }]);

    w.update(2);
    expect(numbers).toStrictEqual([1, 1, 1, 2, 2, 2]);
    expect(strings).toStrictEqual(['1', '1', '1', '2', '2', '2']);
    expect(arrays).toStrictEqual([[1], [2]]);
    expect(objects).toStrictEqual([{ 1: true }, { 2: true }]);
  });
  test('mapper is memoized', () => {
    const w = WatchableSubject.of(2);
    const m = w.map((v) => [v]);
    expect(m.hasValue()).toBeTruthy();
    expect(m.getValue()).toBe(m.getValue());

    const observed: number[][] = [];
    m.watch((v) => observed.push(v));
    expect(observed).toHaveLength(1);
    expect(m.getValue()).toBe(observed[0]);
  });
  test('snapshot with non-empty watchable', () => {
    const observedW: number[] = [];
    const observedS: number[] = [];
    const w = WatchableSubject.of(5);
    w.watch((v) => observedW.push(v));
    expect(observedW).toStrictEqual([5]);
    const s = w.snapshot();
    s.watch((v) => observedS.push(v));
    expect(observedS).toStrictEqual([5]);
    w.update(6);
    w.update(7);
    expect(observedW).toStrictEqual([5, 6, 7]);
    expect(observedS).toStrictEqual([5]);
  });
  test('snapshot with empty watchable', async () => {
    const observedW: number[] = [];
    const observedS: number[] = [];
    const w = WatchableSubject.empty<number>();
    w.watch((v) => observedW.push(v));
    expect(observedW).toHaveLength(0);
    const s = w.snapshot().map((v) => v * 2);
    s.watch((v) => observedS.push(v));
    expect(observedS).toHaveLength(0);
    w.update(6);
    w.update(7);
    expect(observedW).toStrictEqual([6, 7]);
    // Wait for a macrotick for the promise to resolve to populate the snapshot.
    await Promise.resolve();
    expect(observedS).toStrictEqual([12]);
  });
});

describe('partialCombineWatchables', () => {
  test('handles empty maps', () => {
    const combined = partialCombineWatchable(new Map());
    expect(combined.hasValue()).toBeTruthy();
    expect(combined.getValue()).toEqual(new Map());
  });
  test('has initial values', () => {
    const one = WatchableSubject.of(1);
    const two = WatchableSubject.of(2);
    const empty = WatchableSubject.empty<number>();

    const combined = partialCombineWatchable(
      new Map([
        ['one', one],
        ['two', two],
        ['empty', empty],
      ])
    );
    expect(combined.getValue()).toEqual(
      new Map([
        ['one', 1],
        ['two', 2],
      ])
    );
  });
  test('updates individual values', () => {
    const one = WatchableSubject.of(1);
    const two = WatchableSubject.of(2);
    const empty = WatchableSubject.empty<number>();

    const observed: Map<string, number>[] = [];
    const combined = partialCombineWatchable<string, number>(
      new Map([
        ['one', one],
        ['two', two],
        ['empty', empty],
      ])
    );
    const unsubscribe = combined.watch((v) => observed.push(v));

    two.update(3);
    // no-op don't fire
    two.update(3);
    empty.update(4);
    const expected = [
      new Map([
        ['one', 1],
        ['two', 2],
      ]),
      new Map([
        ['one', 1],
        ['two', 3],
      ]),
      new Map([
        ['one', 1],
        ['two', 3],
        ['empty', 4],
      ]),
    ];
    expect(observed).toEqual(expected);

    // No more updates
    unsubscribe();
    two.update(5);
    expect(observed).toEqual(expected);
  });
  test('can handle enormous Maps', () => {
    const subjects = new Map<number, Watchable<number>>();
    const expected = new Map<number, number>();
    for (let i = 0; i < 100_000; i++) {
      subjects.set(i, WatchableSubject.of(i));
      expected.set(i, i);
    }
    const observed: Map<number, number>[] = [];
    partialCombineWatchable(subjects).watch((v) => observed.push(v));
    expect(observed).toEqual([expected]);
  });
});

describe('withHooks', () => {
  function withOpLogging<T>(
    watchable: Watchable<T>
  ): [Watchable<T>, Array<'setup' | 'teardown'>] {
    const ops: Array<'setup' | 'teardown'> = [];
    const withOps = watchable.withHooks({
      setup: () => ops.push('setup'),
      tearDown: () => ops.push('teardown'),
    });
    return [withOps, ops];
  }

  test('calls setup and teardown on watch', () => {
    const subject = WatchableSubject.of('');
    const [watchable, ops] = withOpLogging(subject);
    expect(ops).toEqual([]);
    const unsub = watchable.watch(() => {});
    expect(ops).toEqual(['setup']);
    unsub();
    expect(ops).toEqual(['setup', 'teardown']);

    const unsub2 = watchable.watch(() => {});
    expect(ops).toEqual(['setup', 'teardown', 'setup']);
    unsub2();
    expect(ops).toEqual(['setup', 'teardown', 'setup', 'teardown']);
  });

  test('calls setup and teardown only on first and last watch', () => {
    const subject = WatchableSubject.of('');
    const [watchable, ops] = withOpLogging(subject);
    expect(ops).toEqual([]);
    const unsub1 = watchable.watch(() => {});
    expect(ops).toEqual(['setup']);
    const unsub2 = watchable.watch(() => {});
    const unsub3 = watchable.watch(() => {});
    expect(ops).toEqual(['setup']);
    unsub1();
    unsub2();
    expect(ops).toEqual(['setup']);
    const unsub4 = watchable.watch(() => {});
    unsub3();
    expect(ops).toEqual(['setup']);
    unsub4();
    expect(ops).toEqual(['setup', 'teardown']);
  });
});
