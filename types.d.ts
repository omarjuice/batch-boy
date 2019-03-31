export type Resolution = {
    key: number
    resolution: string
}
export type MockAsync = (keys: number[]) => Promise<Resolution[]>