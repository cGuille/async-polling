# AsyncPolling

An easy way to run reliable polling without messing with setTimeout.

[Here is an article](http://zetafleet.com/blog/why-i-consider-setinterval-harmful) explaining why using `setInterval` is discouraged, especially when dealing with asynchronous tasks.

## Installation

### In the browser

With bower:

```bash
bower install async-polling
```

Then include the script:

```html
<script src="bower_components/async-polling/dist/async-polling.min.js"></script>
<script>
// Here you can use the AsyncPolling constructor.
</script>
```

### In NodeJS

With npm:

```bash
npm install async-polling
```

Then require the module:
```js
var AsyncPolling = require('async-polling');
```

## Usage

Here is the basic usage:

```js
AsyncPolling(function (end) {
    // Do whatever you want.
        
    // Then notify the polling when your job is done:
    end();
    // This will schedule the next call.
}, 3000).run();
```

You can also send a result to the `end` callback with the usual signature `(error, result)`. Pass `null` as first argument when everythin is fine:
```js
var polling = AsyncPolling(function (end) {
    someAsynchroneProcess(function (error, response) {
        if (error) {
            // Notify the error:
            end(error)
            return;
        }
        
        // Do something with the result.
        
        // Then send it to the listeners:
        end(null, result);
    });
}, 3000);

polling.on('error', function (error) {
    // The polling encountered an error, handle it here.
});
polling.on('result', function (result) {
    // The polling yielded some result, process it here.
});

polling.run(); // Let's start polling.
```

See also [the demo script](https://github.com/cGuille/async-polling/blob/master/demo/demo.js).

## API

### Create a polling

```js
var polling = AsyncPolling(pollingFunc, delay);
```

- `pollingFunc(end)`: [`function`] The function to run periodically; takes a callback as parameter to notify the end of the process and possibly send a result. It will be bound to the polling object.
- `delay`: [`number`(ms)|`object`] the delay between two calls of `pollingFunc`. If the type is not `number`, the `.valueOf()` method of the object will be called to retrieve the amount of milliseconds.

### Run the polling

```js
polling.run();
```

### Stop the polling

```js
polling.stop();
```

Since the polling function is bound to `polling`, one can call `this.stop()` from within the polling function:
```js
AsyncPolling(function (end) {
    // Do some stuff
    
    // Here I want to stop the polling:
    this.stop();
    end();
}, 3000).run();
```

### Listen to events

```js
polling.on(eventName, listener);
```

- `eventName`: The name of the event for which we register (`run`, `start`, `error`, `result`, `end`, `schedule`, `stop`).
- `listener`: The function to call when the specified event occurs.
