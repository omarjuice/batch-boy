export declare type BatchingFunction = (keys: any[]) => Promise<any[]>
export declare interface IDeferred {
    resolve: (resolution: any) => any
    reject: (rejection: Error) => any
    promise: Promise<any>
}
export declare type Cache = {
    [key: string]: IDeferred
}
export declare type key = string | number

export declare class Batch {
    private _func: BatchingFunction
    private _cache: Cache
    private _queue: key[]
    public prevBatch: key[]
    private _isQueueing: boolean
    private _ongoingJobsEnableQueueing: boolean
    private _addToQueue(key: key): void
    private _dispatch(): void
    public load(key: key): Promise<any>
    public loadMany(keys: key[]): Promise<any[]>
    public reload(key: key): Promise<any>
    public reloadMany(keys: key[]): Promise<any[]>
    public clearKey(key: key): Batch
    public clearKeys(keys: key[]): Batch
    public prime(key: key, value: any): Promise<any>
    public getFromCache(key): Promise<any> | null
    public ongoingJobsEnableQueueing(bool: boolean): Batch
    constructor()

}