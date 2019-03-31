export type Resolution = {
    key: number
    resolution: string
}
export type BatchingFunction = (keys: any[]) => Promise<any[]>
export interface IDeferred {
    resolve: (resolution: any) => any
    reject: (rejection: Error) => any
    promise: Promise<any>
}