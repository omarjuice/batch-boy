import { BatchingFunction } from "./types";
import Deferred from './Deferred';
import { Cache } from './types';
export default class Batch {
    private _func: BatchingFunction
    private _cache: Cache
    private _queue: any[]
    public prevBatch: any[]
    private _isQueueing: boolean
    constructor(batchingFunc: BatchingFunction) {
        if (typeof batchingFunc !== 'function') {
            throw new TypeError('batchingFunc must be a function')
        }
        this._func = batchingFunc
        this._cache = {}
        this._queue = []
        this._isQueueing = false
        this.prevBatch = []
    }
    public load(key: string | number): Promise<any> {
        if (!['string', 'number'].includes(typeof key)) {
            throw new TypeError('key must be a string or number.')
        }
        if (!this._cache[key]) {
            this._cache[key] = new Deferred()
            this._addToQueue(key)
        }
        return this._cache[key].promise
    }
    private _addToQueue(key: string | number) {
        this._queue.push(key)
        if (!this._isQueueing) {
            this._dispatch()
            this._isQueueing = true
        }
    }
    private _dispatch() {
        process.nextTick(async () => {
            const keys = [...this._queue]
            this._queue = []
            const values = await this._func(keys).catch(e => {
                for (let key of keys) {
                    this._cache[key].reject(e)
                }
                return null
            })
            if (values) {
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i]
                    const value = values[i]
                    this._cache[key].resolve(value)
                }
                this.prevBatch = [...keys]
            }
            if (this._queue.length) {
                this._dispatch()
            } else {
                this._isQueueing = false
            }
        })
    }
    public clearCache() {
        this._cache = {}
    }
    public clearKeys(identifiers: string[] | number[]) {
        for (let identifier of identifiers) {
            this._cache[identifier] = undefined
        }
    }
    public prime(key: string | number, value: any): Promise<any> {
        this._cache[key] = new Deferred()
        this._cache[key].resolve(value)
        return this._cache[key].promise
    }
}
