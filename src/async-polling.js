(function () {
    'use strict';

    var hasWindow = typeof(window) !== 'undefined';

    var inherits = hasWindow ? window.nodeUtil.inherits : require('util').inherits;
    var EventEmitter = hasWindow ? window.nodeEventEmitter : require('events').EventEmitter;

    /**
     * This event emitter can fire the following events:
     * run, start, result, error, end, schedule, stop
     *
     * @param {Function} pollingFunc Called for each poll with a callback as 
     *                               parameter. Call it at the end of each poll
     *                               to provide an error (if any),
     *                               a result (if any) and whether to stop
     *                               the polling or not.
     * @param {number|object} delay Minimum number of milliseconds to wait
     *                              before scheduling a new poll.
     */
    function AsyncPolling(pollingFunc, delay) {
        if (!(this instanceof AsyncPolling)) {
            return new AsyncPolling(pollingFunc, delay);
        }

        this._pollingFunc = pollingFunc.bind(this, pollCallback.bind(this));
        this._delay = delay.valueOf();

        this._timer = null;
        this._mustSchedule = false;
    }
    inherits(AsyncPolling, EventEmitter);

    /**
     * Start polling.
     */
    AsyncPolling.prototype.run = function run() {
        this.emit('run');
        this._mustSchedule = true;
        poll.call(this);
    };

    /**
     * Cancel any scheduled poll and prevent future scheduling.
     */
    AsyncPolling.prototype.stop = function AsyncPolling_stop() {
        this._mustSchedule = false;
        if (this._timer !== null) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        this.emit('stop');
    };

    function poll() {
        this.emit('start');
        this._pollingFunc();
    }

    function pollCallback(error, result) {
        if (error) {
            this.emit('error', error);
        } else {
            this.emit('result', result);
        }
        this.emit('end', error, result);

        if (this._mustSchedule) {
            this._timer = setTimeout(poll.bind(this), this._delay);
            this.emit('schedule', this._delay);
        }
    }

    if (hasWindow) {
        window.AsyncPolling = AsyncPolling;
    } else {
        module.exports = AsyncPolling;
    }
}());
