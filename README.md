# Watchable

A small library to expose state into React.

## Features

- 🧑‍🏫 **Easy to learn:** Small API surface - all you need are two classes and a hook to get started.
- 🤏 **Small:** 2.15 kb bundle minified and gzipped. Supports ESM and tree shaking.
- ⚡ **Fast:** Minimized renders with built-in memoization.
- ⚛️  **React:** Built for React in mind with hooks built in.
- ⌨️  **Typescript:** It's written in TypeScript and types are exported along with the library.

## Introduction

Watchables are objects that store your application state. They can be subscribed too for updates, but at the same time the existing value can be retrieved synchronously, even when transforms are applied. This library pairs well with React and comes with a couple of [hooks](https://github.com/shortwave/watchable/blob/main/src/hooks.ts) such as `useWatchable` and `useMemoizedWatchable`.

A watchable can be used a simple way to expose state into your React components without needing a full blown state management system like Redux or MobX.

See our [blog post](https://www.shortwave.com/blog/) for more background on how this library came to be.

## Basic usage

See the example/ and tests/ directory for a full listing!

```typescript
import { WatchableSubject } from '@shortwave/watchable';

const v = WatchableSubject.of(0);

console.log(`Count is at ${w.getValue()}`);
// output: Count is at 0

/* Subscriptions to a value synchronously fires, so updates cannot be missed. */
v.watch((count) => {
  console.log(`Count is ${w.getValue()}`);
});
// output: Count is 0

v.update(1);
// output: Count is 1

v.update(1);
// no output - the value is memoized
```

<!-- TODO(rockwotj): We should probably put a full API listing in the readme. -->

## Contributing

We're using [DTS](https://github.com/weiran-zsd/dts-cli) to manage this library.

The library resides inside `/src`, and there is a [Vite-based](https://vitejs.dev) playground for it inside `/example`.

The recommended workflow is to run DTS in one terminal:

```bash
npm start # or yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

Then run the example inside another:

```bash
cd example
npm i # or yarn to install dependencies
npm start # or yarn start
```

The default example imports and live reloads whatever is in `/dist`, so if you are seeing an out of date component, make sure DTS is running in watch mode like we recommend above. 

To do a one-off build, use `npm run build` or `yarn build`.

To run tests, use `npm test` or `yarn test`.
