// <reference path="./index.d.ts" />
// <reference path="../types.d.ts" />
import Deferred from './Deferred';

/** @class  */
type batchingFunc = (keys: (string | number)[]) => Promise<any[]>;
class BatchInternal {
    public func: batchingFunc
    public cache: {
        [key: string]: {
            resolve: (resolution: any) => any
            reject: (rejection: Error) => any
            promise: Promise<any>
        }
    }
    public queue: string[] | number[]
    public ongoingJobsEnableQueueing: boolean
    public isQueueing: boolean
    public previousBatch: (string | number)[]
    constructor(batchingFunc: batchingFunc, prevBatch) {
        this.func = batchingFunc
        this.previousBatch = prevBatch
        this.cache = {}
        this.queue = []
        this.isQueueing = false
        this.ongoingJobsEnableQueueing = true
    }
    public addToQueue(key) {
        this.queue.push(key)
        if (!this.isQueueing) {
            this.dispatch()
            this.isQueueing = true
        }
    }
    public dispatch() {
        process.nextTick(eval(`
        ${this.ongoingJobsEnableQueueing ? 'async' : ''} () => {
            const keys = [...this.queue]
            this.queue = []
            ${this.ongoingJobsEnableQueueing ? 'await' : ''} this.func(keys)
                .then((values) => {
                    for (let i = 0; i < keys.length; i++) {
                        const key = keys[i]
                        const value = values[i]
                        this.cache[key].resolve(value)
                    }
                    while(this.previousBatch.length){
                        this.previousBatch.pop()
                    }
                    this.previousBatch.push(...keys)
                })
                .catch(e => {
                    for (let key of keys) {
                        this.cache[key].reject(e)
                        this.cache[key] = undefined
                    }
                    return null
                })
            if (this.queue.length) {
                this.dispatch()
            } else {
                this.isQueueing = false
            }
        }`))
    }
}
const internal = Symbol('_internal_')
class Batch {
    /**
     * @private operations.
     */
    private [internal]: BatchInternal
    /**
     * @property The previous batch.
     */
    public prevBatch: any[]
    /**
     * @param batchingFunc takes an array of keys and resolves to a `Promise` for an array of values
     */
    constructor(batchingFunc: batchingFunc) {
        if (typeof batchingFunc !== 'function') {
            throw new TypeError(`batchingFunc must be a function. Recieved ${batchingFunc}`)
        }
        this.prevBatch = []
        this[internal] = new BatchInternal(batchingFunc, this.prevBatch)
    }
    /**
     * @method 
     * Accepts a key and returns a Promise for a value.
     */
    public load(key: string | number): Promise<any> {
        if (!['string', 'number'].includes(typeof key)) {
            throw new TypeError(`key must be a string or number. Recieved ${key}`)
        }
        if (!this[internal].cache[key]) {
            this[internal].cache[key] = new Deferred()
            this[internal].addToQueue(key)
        }
        return this[internal].cache[key].promise
    }
    /**
     * @method 
     * Accepts an array of keys and returns a Promise for an array of values.
     */
    public loadMany(keys: (string | number)[]): Promise<any[]> {
        return Promise.all(keys.map(key => this.load(key)))
    }
    /**
     * @method 
     * Clear the cache of all values and keys.
     */
    public clearCache() {
        this[internal].cache = {}
        return this
    }
    /**
     * @method
     * Clear a specific key from the cache.
     */
    public clearKey(key: string | number) {
        this[internal].cache[key] = undefined
        return this
    }
    /**
     * @method
     * Clear many keys from the cache.
     */
    public clearKeys(keys: (string | number)[]): Batch {
        for (let key of keys) {
            this[internal].cache[key] = undefined
        }
        return this
    }
    /**
     * @method
     * Sets the given key value pair in the cache.
     */
    public prime(key: string | number, value: any): Promise<any> {
        this[internal].cache[key] = new Deferred()
        this[internal].cache[key].resolve(value)
        return this[internal].cache[key].promise
    }
    /**
     * @method
     * Returns a promise for a value that already exists in the cache
     */
    public getFromCache(key: string | number): Promise<any> | null {
        return this[internal].cache[key] ? this[internal].cache[key].promise : null
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
        this[internal].ongoingJobsEnableQueueing = bool
        return this
    }
}
if (process.env.NODE_ENV === 'build') {
    module.exports = Batch
}
export default Batch