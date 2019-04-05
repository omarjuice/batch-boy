"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Deferred_1 = require("./Deferred");
module.exports = /** @class */ (function () {
    function Batch(batchingFunc) {
        if (typeof batchingFunc !== 'function') {
            throw new TypeError("batchingFunc must be a function. Recieved " + batchingFunc);
        }
        this._func = batchingFunc;
        this._cache = {};
        this._queue = [];
        this._isQueueing = false;
        this.prevBatch = [];
        this._ongoingJobsEnableQueueing = true;
    }
    Batch.prototype.load = function (key) {
        if (!['string', 'number'].includes(typeof key)) {
            throw new TypeError("key must be a string or number. Recieved " + key);
        }
        if (!this._cache[key]) {
            this._cache[key] = new Deferred_1.default();
            this._addToQueue(key);
        }
        return this._cache[key].promise;
    };
    Batch.prototype.loadMany = function (keys) {
        var _this = this;
        return Promise.all(keys.map(function (key) { return _this.load(key); }));
    };
    Batch.prototype._addToQueue = function (key) {
        this._queue.push(key);
        if (!this._isQueueing) {
            this._dispatch();
            this._isQueueing = true;
        }
    };
    Batch.prototype._dispatch = function () {
        process.nextTick(eval("\n        " + (this._ongoingJobsEnableQueueing ? 'async' : '') + " () => {\n            const keys = [...this._queue]\n            this._queue = []\n            " + (this._ongoingJobsEnableQueueing ? 'await' : '') + " this._func(keys)\n                .then((values) => {\n                    for (let i = 0; i < keys.length; i++) {\n                        const key = keys[i]\n                        const value = values[i]\n                        this._cache[key].resolve(value)\n                    }\n                    this.prevBatch = [...keys]\n                })\n                .catch(e => {\n                    for (let key of keys) {\n                        this._cache[key].reject(e)\n                        this._cache[key] = undefined\n                    }\n                    return null\n                })\n            if (this._queue.length) {\n                this._dispatch()\n            } else {\n                this._isQueueing = false\n            }\n        }"));
    };
    Batch.prototype.clearCache = function () {
        this._cache = {};
        return this;
    };
    Batch.prototype.clearKey = function (key) {
        this._cache[key] = undefined;
        return this;
    };
    Batch.prototype.clearKeys = function (keys) {
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            this._cache[key] = undefined;
        }
        return this;
    };
    Batch.prototype.prime = function (key, value) {
        this._cache[key] = new Deferred_1.default();
        this._cache[key].resolve(value);
        return this._cache[key].promise;
    };
    Batch.prototype.getFromCache = function (key) {
        return this._cache[key] ? this._cache[key].promise : null;
    };
    Batch.prototype.reload = function (key) {
        return this.clearKey(key).load(key);
    };
    Batch.prototype.reloadMany = function (keys) {
        return this.clearKeys(keys).loadMany(keys);
    };
    Batch.prototype.ongoingJobsEnableQueueing = function (bool) {
        if (bool === void 0) { bool = true; }
        this._ongoingJobsEnableQueueing = bool;
        return this;
    };
    return Batch;
}());
