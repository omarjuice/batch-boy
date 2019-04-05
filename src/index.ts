import Deferred from './Deferred';
import { IDeferred, BatchingFunction, Cache, key } from '../types';



class Batch {
    private _func: BatchingFunction
    private _cache: Cache
    private _queue: key[]
    public prevBatch: key[]
    private _isQueueing: boolean
    private _ongoingJobsEnableQueueing: boolean
    constructor(batchingFunc: BatchingFunction) {
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
    public load(key: key): Promise<any> {
        if (!['string', 'number'].includes(typeof key)) {
            throw new TypeError(`key must be a string or number. Recieved ${key}`)
        }
        if (!this._cache[key]) {
            this._cache[key] = new Deferred()
            this._addToQueue(key)
        }
        return this._cache[key].promise
    }
    public loadMany(keys: key[]): Promise<any[]> {
        return Promise.all(keys.map(key => this.load(key)))
    }
    private _addToQueue(key: key) {
        this._queue.push(key)
        if (!this._isQueueing) {
            this._dispatch()
            this._isQueueing = true
        }
    }
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
    public clearCache() {
        this._cache = {}
        return this
    }
    public clearKey(key: key) {
        this._cache[key] = undefined
        return this
    }
    public clearKeys(keys: key[]) {
        for (let key of keys) {
            this._cache[key] = undefined
        }
        return this
    }
    public prime(key: key, value: any): Promise<any> {
        this._cache[key] = new Deferred()
        this._cache[key].resolve(value)
        return this._cache[key].promise
    }
    public getFromCache(key) {
        return this._cache[key] ? this._cache[key].promise : null
    }
    public reload(key: key) {
        return this.clearKey(key).load(key)
    }
    public reloadMany(keys: key[]) {
        return this.clearKeys(keys).loadMany(keys)
    }
    public ongoingJobsEnableQueueing(bool = true) {
        this._ongoingJobsEnableQueueing = bool
        return this
    }
}
module.exports = Batch
