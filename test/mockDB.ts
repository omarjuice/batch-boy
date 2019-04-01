import Deferred from '../src/Deferred';
import { IDeferred, Resolution, ResolutionGenerator, key } from '../src/types';

export default class MockDB {
    private _entries: Resolution[]
    private _queries: any[]
    private _throttle: number
    private _executing: boolean
    private _timer: any
    public error: Error
    constructor(numEntries: number, throttle: number, resolutionGenerator: ResolutionGenerator, customKeys: any[] = []) {
        this._entries = [];
        this._throttle = throttle
        this._queries = []
        this._executing = false
        this._timer = null
        this.error = new Error('Something went wrong...')
        for (let i = 0; i < numEntries; i++) {
            this._entries.push(resolutionGenerator(customKeys[i] || i + 1))
        }
    }
    public query(keys: key[], willThrow: boolean = false): Promise<Resolution[]> {
        const deferred: IDeferred = new Deferred();
        this._queries.push(() => {
            if (willThrow) {
                try {
                    deferred.resolve(keys.map(key => this._findThatThrows(key)))
                } catch (e) {
                    deferred.reject(e)
                }
            } else {
                deferred.resolve(keys.map(key => this._find(key)))
            }
        })
        if (!this._executing) this._execute();
        return deferred.promise
    }
    private _find(key: key) {
        for (let entry of this._entries) {
            if (entry.key === key) return entry
        }
        return null
    }
    private _findThatThrows(key: key) {
        throw this.error
    }
    public _execute() {
        this._executing = true
        this._timer = setTimeout(() => {
            this._queries.shift()()
            if (this._queries.length) {
                this._execute()
            } else {
                this._executing = false
            }
        }, this._throttle)
    }
    public stopExecution() {
        clearTimeout(this._timer)
        this._executing = false
    }
}