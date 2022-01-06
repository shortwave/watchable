import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {WatchableSubject, Watchable, useWatchable} from '../src';


// Class counter example for React, but using Watchables (which is overkill here, but hey it's an example!)
class CounterService {
  private state = WatchableSubject.of(0);

  // Return a Watchable here as it's the readonly version.
  value(): Watchable<number> {
    return this.state;
  }

  increment(): void {
    this.state.update(this.state.getValue() + 1);
  }
}


const App = () => {
  const service = React.useMemo(() => new CounterService(), []);
  const value = useWatchable(service.value());
  return (
    <div>
      <p>
        {value === null ? 'Loading...' : `Counter value: ${value}`}
      </p>
      <p>
        <button onClick={() => service.increment()}>Click me!</button>
      </p>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
