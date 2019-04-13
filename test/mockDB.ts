import Deferred from './Deferred';

export default class MockDB {
    private _entries: any[]
    private _queries: any[]
    private _throttle: number
    private _executing: boolean
    private _timer: any
    private _willThrow: boolean
    public error: Error
    constructor(numEntries: number, throttle: number, resolutionGenerator, customKeys: any[] = []) {
        this._entries = [];
        this._throttle = throttle
        this._queries = []
        this._executing = false
        this._timer = null
        this._willThrow = false
        this.error = new Error('Something went wrong...')
        for (let i = 0; i < numEntries; i++) {
            this._entries.push(resolutionGenerator(customKeys[i] || i + 1))
        }
    }
    public query(keys): Promise<any[]> {
        const deferred = new Deferred();
        this._queries.push(() => {
            if (this._willThrow) {
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
    private _find(key) {
        for (let entry of this._entries) {
            if (entry.key === key) return entry
        }
        return null
    }
    private _findThatThrows(key) {
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
    public throwsException(boolean: boolean) {
        this._willThrow = boolean
        return this
    }

}