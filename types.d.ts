export type Resolution = {
    key: number
    resolution: string
}
export type MockAsync = (keys: number[]) => Promise<Resolution[]>
export type BatchingFunction = (keys: any[]) => Promise<any[]>
export type Load = (key: any, time?: number) => Promise<any>