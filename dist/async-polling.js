// Copyright Joyent, Inc. and other Node contributors.
// Adapted to work in the browser by Guillaume Charmetant (@cGuille)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

(function (exports) {
    'use strict';

    var formatRegExp = /%[sdj%]/g;
    exports.format = function(f) {
        if (!isString(f)) {
            var objects = [];
            for (var i = 0; i < arguments.length; i++) {
                objects.push(inspect(arguments[i]));
            }
            return objects.join(' ');
        }

        var i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function(x) {
            if (x === '%%') return '%';
            if (i >= len) return x;
            switch (x) {
                case '%s': return String(args[i++]);
                case '%d': return Number(args[i++]);
                case '%j':
                    try {
                        return JSON.stringify(args[i++]);
                    } catch (_) {
                        return '[Circular]';
                    }
                default:
                    return x;
            }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
            if (isNull(x) || !isObject(x)) {
                str += ' ' + x;
            } else {
                str += ' ' + inspect(x);
            }
        }
        return str;
    };


    /**
     * Echos the value of a value. Trys to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Object} opts Optional options object that alters the output.
     */
    /* legacy: obj, showHidden, depth, colors*/
    function inspect(obj, opts) {
        // default options
        var ctx = {
            seen: [],
            stylize: stylizeNoColor
        };
        // legacy...
        if (arguments.length >= 3) ctx.depth = arguments[2];
        if (arguments.length >= 4) ctx.colors = arguments[3];
        if (isBoolean(opts)) {
            // legacy...
            ctx.showHidden = opts;
        } else if (opts) {
            // got an "options" object
            exports._extend(ctx, opts);
        }
        // set default options
        if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
        if (isUndefined(ctx.depth)) ctx.depth = 2;
        if (isUndefined(ctx.colors)) ctx.colors = false;
        if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
        if (ctx.colors) ctx.stylize = stylizeWithColor;
        return formatValue(ctx, obj, ctx.depth);
    }
    exports.inspect = inspect;


    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    inspect.colors = {
        'bold' : [1, 22],
        'italic' : [3, 23],
        'underline' : [4, 24],
        'inverse' : [7, 27],
        'white' : [37, 39],
        'grey' : [90, 39],
        'black' : [30, 39],
        'blue' : [34, 39],
        'cyan' : [36, 39],
        'green' : [32, 39],
        'magenta' : [35, 39],
        'red' : [31, 39],
        'yellow' : [33, 39]
    };

    // Don't use 'blue' not visible on cmd.exe
    inspect.styles = {
        'special': 'cyan',
        'number': 'yellow',
        'boolean': 'yellow',
        'undefined': 'grey',
        'null': 'bold',
        'string': 'green',
        'date': 'magenta',
        // "name": intentionally not styling
        'regexp': 'red'
    };


    function stylizeWithColor(str, styleType) {
        var style = inspect.styles[styleType];

        if (style) {
            return '\u001b[' + inspect.colors[style][0] + 'm' + str +
                         '\u001b[' + inspect.colors[style][1] + 'm';
        } else {
            return str;
        }
    }


    function stylizeNoColor(str, styleType) {
        return str;
    }


    function arrayToHash(array) {
        var hash = {};

        array.forEach(function(val, idx) {
            hash[val] = true;
        });

        return hash;
    }


    function formatValue(ctx, value, recurseTimes) {
        // Provide a hook for user-specified inspect functions.
        // Check that value is an object with an inspect function on it
        if (ctx.customInspect &&
                value &&
                isFunction(value.inspect) &&
                // Filter out the util module, it's inspect function is special
                value.inspect !== exports.inspect &&
                // Also filter out any prototype objects using the circular check.
                !(value.constructor && value.constructor.prototype === value)) {
            var ret = value.inspect(recurseTimes, ctx);
            if (!isString(ret)) {
                ret = formatValue(ctx, ret, recurseTimes);
            }
            return ret;
        }

        // Primitive types cannot have properties
        var primitive = formatPrimitive(ctx, value);
        if (primitive) {
            return primitive;
        }

        // Look up the keys of the object.
        var keys = Object.keys(value);
        var visibleKeys = arrayToHash(keys);

        if (ctx.showHidden) {
            keys = Object.getOwnPropertyNames(value);
        }

        // This could be a boxed primitive (new String(), etc.), check valueOf()
        // NOTE: Avoid calling `valueOf` on `Date` instance because it will return
        // a number which, when object has some additional user-stored `keys`,
        // will be printed out.
        var formatted;
        var raw = value;
        try {
            // the .valueOf() call can fail for a multitude of reasons
            if (!isDate(value))
                raw = value.valueOf();
        } catch (e) {
            // ignore...
        }

        if (isString(raw)) {
            // for boxed Strings, we have to remove the 0-n indexed entries,
            // since they just noisey up the output and are redundant
            keys = keys.filter(function(key) {
                return !(key >= 0 && key < raw.length);
            });
        }

        // Some type of object without properties can be shortcutted.
        if (keys.length === 0) {
            if (isFunction(value)) {
                var name = value.name ? ': ' + value.name : '';
                return ctx.stylize('[Function' + name + ']', 'special');
            }
            if (isRegExp(value)) {
                return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
            }
            if (isDate(value)) {
                return ctx.stylize(Date.prototype.toString.call(value), 'date');
            }
            if (isError(value)) {
                return formatError(value);
            }
            // now check the `raw` value to handle boxed primitives
            if (isString(raw)) {
                formatted = formatPrimitiveNoColor(ctx, raw);
                return ctx.stylize('[String: ' + formatted + ']', 'string');
            }
            if (isNumber(raw)) {
                formatted = formatPrimitiveNoColor(ctx, raw);
                return ctx.stylize('[Number: ' + formatted + ']', 'number');
            }
            if (isBoolean(raw)) {
                formatted = formatPrimitiveNoColor(ctx, raw);
                return ctx.stylize('[Boolean: ' + formatted + ']', 'boolean');
            }
        }

        var base = '', array = false, braces = ['{', '}'];

        // Make Array say that they are Array
        if (isArray(value)) {
            array = true;
            braces = ['[', ']'];
        }

        // Make functions say that they are functions
        if (isFunction(value)) {
            var n = value.name ? ': ' + value.name : '';
            base = ' [Function' + n + ']';
        }

        // Make RegExps say that they are RegExps
        if (isRegExp(value)) {
            base = ' ' + RegExp.prototype.toString.call(value);
        }

        // Make dates with properties first say the date
        if (isDate(value)) {
            base = ' ' + Date.prototype.toUTCString.call(value);
        }

        // Make error with message first say the error
        if (isError(value)) {
            base = ' ' + formatError(value);
        }

        // Make boxed primitive Strings look like such
        if (isString(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            base = ' ' + '[String: ' + formatted + ']';
        }

        // Make boxed primitive Numbers look like such
        if (isNumber(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            base = ' ' + '[Number: ' + formatted + ']';
        }

        // Make boxed primitive Booleans look like such
        if (isBoolean(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            base = ' ' + '[Boolean: ' + formatted + ']';
        }

        if (keys.length === 0 && (!array || value.length === 0)) {
            return braces[0] + base + braces[1];
        }

        if (recurseTimes < 0) {
            if (isRegExp(value)) {
                return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
            } else {
                return ctx.stylize('[Object]', 'special');
            }
        }

        ctx.seen.push(value);

        var output;
        if (array) {
            output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
        } else {
            output = keys.map(function(key) {
                return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
            });
        }

        ctx.seen.pop();

        return reduceToSingleString(output, base, braces);
    }


    function formatPrimitive(ctx, value) {
        if (isUndefined(value))
            return ctx.stylize('undefined', 'undefined');
        if (isString(value)) {
            var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                                                             .replace(/'/g, "\\'")
                                                                                             .replace(/\\"/g, '"') + '\'';
            return ctx.stylize(simple, 'string');
        }
        if (isNumber(value)) {
            // Format -0 as '-0'. Strict equality won't distinguish 0 from -0,
            // so instead we use the fact that 1 / -0 < 0 whereas 1 / 0 > 0 .
            if (value === 0 && 1 / value < 0)
                return ctx.stylize('-0', 'number');
            return ctx.stylize('' + value, 'number');
        }
        if (isBoolean(value))
            return ctx.stylize('' + value, 'boolean');
        // For some reason typeof null is "object", so special case here.
        if (isNull(value))
            return ctx.stylize('null', 'null');
    }


    function formatPrimitiveNoColor(ctx, value) {
        var stylize = ctx.stylize;
        ctx.stylize = stylizeNoColor;
        var str = formatPrimitive(ctx, value);
        ctx.stylize = stylize;
        return str;
    }


    function formatError(value) {
        return '[' + Error.prototype.toString.call(value) + ']';
    }


    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
        var output = [];
        for (var i = 0, l = value.length; i < l; ++i) {
            if (hasOwnProperty(value, String(i))) {
                output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                        String(i), true));
            } else {
                output.push('');
            }
        }
        keys.forEach(function(key) {
            if (!key.match(/^\d+$/)) {
                output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                        key, true));
            }
        });
        return output;
    }


    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
        var name, str, desc;
        desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
        if (desc.get) {
            if (desc.set) {
                str = ctx.stylize('[Getter/Setter]', 'special');
            } else {
                str = ctx.stylize('[Getter]', 'special');
            }
        } else {
            if (desc.set) {
                str = ctx.stylize('[Setter]', 'special');
            }
        }
        if (!hasOwnProperty(visibleKeys, key)) {
            name = '[' + key + ']';
        }
        if (!str) {
            if (ctx.seen.indexOf(desc.value) < 0) {
                if (isNull(recurseTimes)) {
                    str = formatValue(ctx, desc.value, null);
                } else {
                    str = formatValue(ctx, desc.value, recurseTimes - 1);
                }
                if (str.indexOf('\n') > -1) {
                    if (array) {
                        str = str.split('\n').map(function(line) {
                            return '  ' + line;
                        }).join('\n').substr(2);
                    } else {
                        str = '\n' + str.split('\n').map(function(line) {
                            return '   ' + line;
                        }).join('\n');
                    }
                }
            } else {
                str = ctx.stylize('[Circular]', 'special');
            }
        }
        if (isUndefined(name)) {
            if (array && key.match(/^\d+$/)) {
                return str;
            }
            name = JSON.stringify('' + key);
            if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                name = name.substr(1, name.length - 2);
                name = ctx.stylize(name, 'name');
            } else {
                name = name.replace(/'/g, "\\'")
                                     .replace(/\\"/g, '"')
                                     .replace(/(^"|"$)/g, "'")
                                     .replace(/\\\\/g, '\\');
                name = ctx.stylize(name, 'string');
            }
        }

        return name + ': ' + str;
    }


    function reduceToSingleString(output, base, braces) {
        var length = output.reduce(function(prev, cur) {
            return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
        }, 0);

        if (length > 60) {
            return braces[0] +
                         (base === '' ? '' : base + '\n ') +
                         ' ' +
                         output.join(',\n  ') +
                         ' ' +
                         braces[1];
        }

        return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }


    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    var isArray = exports.isArray = Array.isArray;

    function isBoolean(arg) {
        return typeof arg === 'boolean';
    }
    exports.isBoolean = isBoolean;

    function isNull(arg) {
        return arg === null;
    }
    exports.isNull = isNull;

    function isNullOrUndefined(arg) {
        return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;

    function isNumber(arg) {
        return typeof arg === 'number';
    }
    exports.isNumber = isNumber;

    function isString(arg) {
        return typeof arg === 'string';
    }
    exports.isString = isString;

    function isSymbol(arg) {
        return typeof arg === 'symbol';
    }
    exports.isSymbol = isSymbol;

    function isUndefined(arg) {
        return arg === void 0;
    }
    exports.isUndefined = isUndefined;

    function isRegExp(re) {
        return isObject(re) && objectToString(re) === '[object RegExp]';
    }
    exports.isRegExp = isRegExp;

    function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
    }
    exports.isObject = isObject;

    function isDate(d) {
        return isObject(d) && objectToString(d) === '[object Date]';
    }
    exports.isDate = isDate;

    function isError(e) {
        return isObject(e) &&
                (objectToString(e) === '[object Error]' || e instanceof Error);
    }
    exports.isError = isError;

    function isFunction(arg) {
        return typeof arg === 'function';
    }
    exports.isFunction = isFunction;

    function isPrimitive(arg) {
        return arg === null ||
                     typeof arg === 'boolean' ||
                     typeof arg === 'number' ||
                     typeof arg === 'string' ||
                     typeof arg === 'symbol' ||  // ES6 symbol
                     typeof arg === 'undefined';
    }
    exports.isPrimitive = isPrimitive;

    function isBuffer(arg) {
        return arg instanceof Buffer;
    }
    exports.isBuffer = isBuffer;

    function objectToString(o) {
        return Object.prototype.toString.call(o);
    }


    function pad(n) {
        return n < 10 ? '0' + n.toString(10) : n.toString(10);
    }


    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                                'Oct', 'Nov', 'Dec'];

    // 26 Feb 16:19:34
    function timestamp() {
        var d = new Date();
        var time = [pad(d.getHours()),
                                pad(d.getMinutes()),
                                pad(d.getSeconds())].join(':');
        return [d.getDate(), months[d.getMonth()], time].join(' ');
    }


    // log is just a thin wrapper to console.log that prepends a timestamp
    exports.log = function() {
        console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
    };


    /**
     * Inherit the prototype methods from one constructor into another.
     *
     * The Function.prototype.inherits from lang.js rewritten as a standalone
     * function (not on Function.prototype). NOTE: If this file is to be loaded
     * during bootstrapping this function needs to be rewritten using some native
     * functions as prototype setup using normal JavaScript does not work as
     * expected during bootstrapping (see mirror.js in r114903).
     *
     * @param {function} ctor Constructor function which needs to inherit the
     *     prototype.
     * @param {function} superCtor Constructor function to inherit prototype from.
     */
    exports.inherits = function(ctor, superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    };

    exports._extend = function(origin, add) {
        // Don't do anything if add isn't an object
        if (!add || !isObject(add)) return origin;

        var keys = Object.keys(add);
        var i = keys.length;
        while (i--) {
            origin[keys[i]] = add[keys[i]];
        }
        return origin;
    };

    function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }
}(window.nodeUtil = {}));
;
// Copyright Joyent, Inc. and other Node contributors.
// Adapted to work in the browser by Guillaume Charmetant (@cGuille)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

(function () {
    'use strict';

    var util = window.nodeUtil;

    window.nodeEventEmitter = EventEmitter;

    function EventEmitter() {
        EventEmitter.init.call(this);
    }

    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function () {
        if (!this._events || this._events === Object.getPrototypeOf(this)._events)
            this._events = {};

        this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function (n) {
        if (!util.isNumber(n) || n < 0 || isNaN(n))
            throw TypeError('n must be a positive number');
        this._maxListeners = n;
        return this;
    };

    EventEmitter.prototype.emit = function (type) {
        var er, handler, len, args, i, listeners;

        if (!this._events)
            this._events = {};

        // If there is no 'error' event listener then throw.
        if (type === 'error' && !this._events.error) {
            er = arguments[1];
            if (er instanceof Error) {
                throw er; // Unhandled 'error' event
            } else {
                throw Error('Uncaught, unspecified "error" event.');
            }
            return false;
        }

        handler = this._events[type];

        if (util.isUndefined(handler))
            return false;

        if (util.isFunction(handler)) {
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default:
                    len = arguments.length;
                    args = new Array(len - 1);
                    for (i = 1; i < len; i++)
                        args[i - 1] = arguments[i];
                    handler.apply(this, args);
            }
        } else if (util.isObject(handler)) {
            len = arguments.length;
            args = new Array(len - 1);
            for (i = 1; i < len; i++)
                args[i - 1] = arguments[i];

            listeners = handler.slice();
            len = listeners.length;
            for (i = 0; i < len; i++)
                listeners[i].apply(this, args);
        }

        return true;
    };

    EventEmitter.prototype.addListener = function (type, listener) {
        var m;

        if (!util.isFunction(listener))
            throw TypeError('listener must be a function');

        if (!this._events)
            this._events = {};

        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (this._events.newListener)
            this.emit('newListener', type,
                                util.isFunction(listener.listener) ?
                                listener.listener : listener);

        if (!this._events[type])
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        else if (util.isObject(this._events[type]))
            // If we've already got an array, just append.
            this._events[type].push(listener);
        else
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];

        // Check for listener leak
        if (util.isObject(this._events[type]) && !this._events[type].warned) {
            var m;
            if (!util.isUndefined(this._maxListeners)) {
                m = this._maxListeners;
            } else {
                m = EventEmitter.defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                console.error('(node) warning: possible EventEmitter memory ' +
                                            'leak detected. %d listeners added. ' +
                                            'Use emitter.setMaxListeners() to increase limit.',
                                            this._events[type].length);
                console.trace();
            }
        }

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function (type, listener) {
        if (!util.isFunction(listener))
            throw TypeError('listener must be a function');

        var fired = false;

        function g() {
            this.removeListener(type, g);

            if (!fired) {
                fired = true;
                listener.apply(this, arguments);
            }
        }

        g.listener = listener;
        this.on(type, g);

        return this;
    };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener = function (type, listener) {
        var list, position, length, i;

        if (!util.isFunction(listener))
            throw TypeError('listener must be a function');

        if (!this._events || !this._events[type])
            return this;

        list = this._events[type];
        length = list.length;
        position = -1;

        if (list === listener ||
                (util.isFunction(list.listener) && list.listener === listener)) {
            delete this._events[type];
            if (this._events.removeListener)
                this.emit('removeListener', type, listener);

        } else if (util.isObject(list)) {
            for (i = length; i-- > 0;) {
                if (list[i] === listener ||
                        (list[i].listener && list[i].listener === listener)) {
                    position = i;
                    break;
                }
            }

            if (position < 0)
                return this;

            if (list.length === 1) {
                list.length = 0;
                delete this._events[type];
            } else {
                list.splice(position, 1);
            }

            if (this._events.removeListener)
                this.emit('removeListener', type, listener);
        }

        return this;
    };

    EventEmitter.prototype.removeAllListeners = function (type) {
        var key, listeners;

        if (!this._events)
            return this;

        // not listening for removeListener, no need to emit
        if (!this._events.removeListener) {
            if (arguments.length === 0)
                this._events = {};
            else if (this._events[type])
                delete this._events[type];
            return this;
        }

        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
            for (key in this._events) {
                if (key === 'removeListener') continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = {};
            return this;
        }

        listeners = this._events[type];

        if (util.isFunction(listeners)) {
            this.removeListener(type, listeners);
        } else if (Array.isArray(listeners)) {
            // LIFO order
            while (listeners.length)
                this.removeListener(type, listeners[listeners.length - 1]);
        }
        delete this._events[type];

        return this;
    };

    EventEmitter.prototype.listeners = function (type) {
        var ret;
        if (!this._events || !this._events[type])
            ret = [];
        else if (util.isFunction(this._events[type]))
            ret = [this._events[type]];
        else
            ret = this._events[type].slice();
        return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
        var ret;
        if (!emitter._events || !emitter._events[type])
            ret = 0;
        else if (util.isFunction(emitter._events[type]))
            ret = 1;
        else
            ret = emitter._events[type].length;
        return ret;
    };
}());
;
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

//# sourceMappingURL=async-polling.js.map