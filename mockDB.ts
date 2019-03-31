import Deferred from './Deferred';
import { IDeferred, Resolution } from './types.d';

export default class MockDB {
    private _entries: Resolution[]
    private _queries: any[]
    private _throttle: number
    private _executing: boolean
    constructor(numEntries, throttle) {
        this._entries = [];
        this._throttle = throttle
        this._queries = []
        this._executing = false
        for (let i = 0; i < numEntries; i++) {
            this._entries.push({ key: i + 1, resolution: "resolution" + i + 1 })
        }
    }
    public query(keys) {
        const deferred: IDeferred = new Deferred();
        this._queries.push(() => deferred.resolve(keys.map(key => this._find(key))))
        if (!this._executing) this._execute();

        return deferred.promise
    }
    private _find(key) {
        for (let entry of this._entries) {
            if (entry.key === key) return entry
        }
        return null
    }
    private _execute() {
        if (this._queries.length) {
            console.log('EXECUTING')
            this._executing = true
            setTimeout(() => {
                this._queries.shift()()
                this._executing = false
                this._execute()
            }, this._throttle)
        }
    }
}