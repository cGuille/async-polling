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

Here is a simple how-to:

```js
var AsyncPolling = require('async-polling');

var polling = AsyncPolling(function (end) {
    console.time('api call');
    apiFetchMock(function (error, response) {
        console.timeEnd('api call');
        end(error, response);
    });
    // Or the simpler but less explicit: apiFetchMock(end);
}, 500);

polling.on('result', function (result) {
    console.log('result:', result);
});

var errorCount = 0;
polling.on('error', function (error) {
    ++errorCount;
    console.error('error #' + errorCount + ':', error);
    if (errorCount >= 3) {
        polling.stop();
    }
});

polling.run();

function apiFetchMock(callback) {
    setTimeout(function () {
        if (Math.random() < 0.5) {
            callback(new Error('This is an API mock error.'));
        } else {
            callback(null, 'Here is the mock API response.');
        }
    }, Math.random() * 5000);
}
```

You can also run [the demo script](https://github.com/cGuille/async-polling/blob/master/demo/demo.js).
