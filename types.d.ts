export type Resolution = {
    key: number | string
    resolution: string
}
export type BatchingFunction = (keys: any[]) => Promise<any[]>
export interface IDeferred {
    resolve: (resolution: any) => any
    reject: (rejection: Error) => any
    promise: Promise<any>
}
export type ResolutionGenerator = (key: any) => Resolution
export type key = string | number