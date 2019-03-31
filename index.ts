import { BatchingFunction } from "./types";
import Deferred from './Deferred';

export default class Batch {
    private _func: BatchingFunction
    private _values: object
    private _queue: any[]
    public prevBatch: any[]
    private _isQueueing: boolean
    constructor(func: BatchingFunction) {
        this._func = func
        this._values = {}
        this._queue = []
        this._isQueueing = false
        this.prevBatch = []
    }
    public load(key: any): Promise<any> {
        if (!this._values[key]) {
            this._values[key] = new Deferred()
            this._addToQueue(key)
        }
        return this._values[key].promise
    }
    private _addToQueue(key) {
        this._queue.push(key)
        if (!this._isQueueing) {
            this._dispatch()
            this._isQueueing = true
        }
    }
    public _dispatch() {
        process.nextTick(async () => {
            const keys = [...this._queue]
            this._queue = []
            const values = await this._func(keys)
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                const value = values[i]
                this._values[key].resolve(value)
            }
            this.prevBatch = [...keys]
            if (this._queue.length) {
                this._dispatch()
            } else {
                this._isQueueing = false
            }
        })

    }
}
