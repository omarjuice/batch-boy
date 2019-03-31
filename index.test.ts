import * as expect from 'expect'
import Batch from './index'
import { Resolution, MockAsync } from './types'
import MockDB from './mockDB';


const mockAsync: MockAsync = (keys, time = 500) => {
    console.log(keys)
    return new Promise(resolve => {
        let resolvedArrayOfValues: Resolution[];
        setTimeout(() => {
            resolvedArrayOfValues = keys.map((key: number): Resolution => ({ key, resolution: 'resolution' + key }))
            resolve(resolvedArrayOfValues)
        }, time)
    })
}


describe('Testing function', () => {
    it('Should return a promise', () => {
        expect(mockAsync([1, 2, 3, 4, 5])).toBeInstanceOf(Promise)
    })
    it('Should mock an async function', async () => {
        const result: Resolution[] = await mockAsync([1, 2, 3, 4, 5])
        expect(result).toEqual([1, 2, 3, 4, 5].map((key: number): Resolution => ({ key, resolution: 'resolution' + key })))
    })
})
describe('Batch', () => {
    it('Should batch calls to a function', async () => {
        const batcher = new Batch(keys => mockAsync(keys))
        const vals = Array(10).fill('x').map((_, i) => batcher.load(i + 1))
        const result = await Promise.all(vals)
        console.log(result);
    })
})

