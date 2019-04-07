// <reference path="./index.d.ts" />
// <reference path="../types.d.ts" />
import Deferred from './Deferred';


/** @class  */
type batchingFunc = (keys: (string | number)[]) => Promise<any[]>;
export class Batch {
    /**
     * @private
     */
    private _func: batchingFunc
    /**
     * @private
     */
    private _cache: {
        [key: string]: {
            resolve: (resolution: any) => any
            reject: (rejection: Error) => any
            promise: Promise<any>
        }
    }
    /**
     * @private
     */
    private _queue: string[] | number[]
    /**
     * The previous batch.
     */
    public prevBatch: any[]
    /**
     * @private
     */
    private _isQueueing: boolean
    /**
     * @private
     */
    private _ongoingJobsEnableQueueing: boolean
    /**
     * @param batchingFunc takes an array of keys and resolves to a `Promise` for an array of values/
     */
    constructor(batchingFunc: batchingFunc) {
        if (typeof batchingFunc !== 'function') {
            throw new TypeError(`batchingFunc must be a function. Recieved ${batchingFunc}`)
        }
        this._func = batchingFunc
        this._cache = {}
        this._queue = []
        this._isQueueing = false
        this.prevBatch = []
        this._ongoingJobsEnableQueueing = true
    }
    /**
     * @method 
     * Accepts a key and returns a Promise for a value.
     */
    public load(key: string | number): Promise<any> {
        if (!['string', 'number'].includes(typeof key)) {
            throw new TypeError(`key must be a string or number. Recieved ${key}`)
        }
        if (!this._cache[key]) {
            this._cache[key] = new Deferred()
            this._addToQueue(key)
        }
        return this._cache[key].promise
    }
    /**
     * @method 
     * Accepts an array of keys and returns a Promise for an array of values.
     */
    public loadMany(keys: (string | number)[]): Promise<any[]> {
        return Promise.all(keys.map(key => this.load(key)))
    }
    /**
     * @private
     */
    private _addToQueue(key) {
        this._queue.push(key)
        if (!this._isQueueing) {
            this._dispatch()
            this._isQueueing = true
        }
    }
    /**
     * @private
     */
    private _dispatch() {
        process.nextTick(eval(`
        ${this._ongoingJobsEnableQueueing ? 'async' : ''} () => {
            const keys = [...this._queue]
            this._queue = []
            ${this._ongoingJobsEnableQueueing ? 'await' : ''} this._func(keys)
                .then((values) => {
                    for (let i = 0; i < keys.length; i++) {
                        const key = keys[i]
                        const value = values[i]
                        this._cache[key].resolve(value)
                    }
                    this.prevBatch = [...keys]
                })
                .catch(e => {
                    for (let key of keys) {
                        this._cache[key].reject(e)
                        this._cache[key] = undefined
                    }
                    return null
                })
            if (this._queue.length) {
                this._dispatch()
            } else {
                this._isQueueing = false
            }
        }`))
    }
    /**
     * @method 
     * Clear the cache of all values and keys.
     */
    public clearCache() {
        this._cache = {}
        return this
    }
    /**
     * @method
     * Clear a specific key from the cache.
     */
    public clearKey(key: string | number) {
        this._cache[key] = undefined
        return this
    }
    /**
     * @method
     * Clear many keys from the cache.
     */
    public clearKeys(keys: (string | number)[]): Batch {
        for (let key of keys) {
            this._cache[key] = undefined
        }
        return this
    }
    /**
     * @method
     * Sets the given key value pair in the cache.
     */
    public prime(key: string | number, value: any): Promise<any> {
        this._cache[key] = new Deferred()
        this._cache[key].resolve(value)
        return this._cache[key].promise
    }
    /**
     * @method
     * Returns a promise for a value that already exists in the cache
     */
    public getFromCache(key: string | number): Promise<any> | null {
        return this._cache[key] ? this._cache[key].promise : null
    }
    /**
     * @method
     * Refetches the value for the given key and returns a promise for the new value.
     */
    public reload(key: string | number): Promise<any> {
        return this.clearKey(key).load(key)
    }
    /**
     * @method
     * Refeches the values for the given array of keys and returns a promise for an array of values.
     */
    public reloadMany(keys: (string | number)[]): Promise<any> {
        return this.clearKeys(keys).loadMany(keys)
    }
    /**
     * @method
     * Default true. Sets whether the batcher will wait for the
     * previous batch to finish before dispatching the next batch.
     * See [docs](https://www.npmjs.com/package/batch-boy#a-major-difference-from-dataloader)
     */
    public ongoingJobsEnableQueueing(bool: boolean = true): Batch {
        this._ongoingJobsEnableQueueing = bool
        return this
    }
}
