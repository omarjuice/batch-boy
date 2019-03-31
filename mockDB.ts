import Deferred from './Deferred';
import { IDeferred, Resolution, ResolutionGenerator } from './types.d';
import { genResolution } from './utils';

export default class MockDB {
    private _entries: Resolution[]
    private _queries: any[]
    private _throttle: number
    private _executing: boolean
    private timer: any
    constructor(numEntries: number, throttle: number, resolutionGenerator: ResolutionGenerator, customKeys: any[] = []) {
        this._entries = [];
        this._throttle = throttle
        this._queries = []
        this._executing = false
        this.timer = null
        for (let i = 0; i < numEntries; i++) {
            this._entries.push(resolutionGenerator(customKeys[i] || i + 1))
        }
    }
    public query(keys: any[]): Promise<Resolution[]> {
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
    public _execute() {
        if (this._queries.length) {
            console.log('EXECUTING')
            this._executing = true
            this.timer = setTimeout(() => {
                this._queries.shift()()
                this._executing = false
                this._execute()
            }, this._throttle)
        }
    }
    public stopExecution() {
        clearTimeout(this.timer)
        this._executing = false
    }
}