import { Resolution } from "./types";

export const genResolution = (key: any): Resolution => {
    return {
        key,
        resolution: 'resolution' + key
    }
}

export const timeBuffer = (buffer: number): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, buffer)
    })
}
export const arrayOfIntegers = (min: number, max: number): number[] => {
    const arr = []
    for (let i = min; i <= max; i++) {
        arr.push(i)
    }
    return arr
}