import { BatchingFunction } from "./types";
import Deferred from './Deferred';

export default class Batch {
    func: BatchingFunction
    values: object
    queue: any[]
    isQueueing: boolean
    constructor(func: BatchingFunction) {
        this.func = func
        this.values = {}
        this.queue = []
        this.isQueueing = false
    }
    load(key: any): Promise<any> {
        this.addToQueue(key)
        if (!this.values[key]) {
            this.values[key] = new Deferred()
        }
        return this.values[key].promise
    }
    addToQueue(key) {
        this.queue.push(key)
        if (!this.isQueueing) {
            this.dispatch()
            this.isQueueing = true
        }
    }
    dispatch() {
        process.nextTick(async () => {
            const keys = [...this.queue]
            this.queue = []
            const values = await this.func(keys)
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                const value = values[i]
                this.values[key].resolve(value)
            }
        })
        this.isQueueing = false
    }
}
