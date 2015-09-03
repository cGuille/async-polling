if (typeof(require) !== 'undefined') {
    var AsyncPolling = require('../src/async-polling');
}

var i = 0;

var polling = AsyncPolling(function (end) {
    ++i;
    if (i === 3) {
        return end(new Error("i is " + i));
    }
    if (i >= 5) {
        this.stop();
        return end(null, '#' + i + ' stop');
    }
    end(null, '#' + i + ' wait a second...');
}, 1000);

['run', 'start', 'end', 'cancel', 'stop'].forEach(function (eventName) {
    polling.on(eventName, function () { console.log('lifecycle:', eventName); });
});

polling.on('result', function (result) {
    console.log('result:', result);
});

polling.on('error', function (error) {
    console.error('error:', error);
});

polling.on('schedule', function (delay) {
    console.log('scheduled poll in ' + delay + 'ms\n');
});

if (typeof(require) !== 'undefined') {
    polling.run();
}
