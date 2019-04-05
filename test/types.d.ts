export type BatchingFunction = (keys: any[]) => Promise<any[]>
export interface IDeferred {
    resolve: (resolution: any) => any
    reject: (rejection: Error) => any
    promise: Promise<any>
}
export type Cache = {
    [key: string]: IDeferred
}
export type key = string | number