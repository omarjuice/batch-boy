import * as expect from 'expect'
// import hello from './index'
import { Resolution, MockAsync } from './types'


const mockAsync: MockAsync = (keys) => {
    return new Promise(resolve => {
        let resolvedArrayOfValues: Resolution[];
        setTimeout(() => {
            resolvedArrayOfValues = keys.map((key: number): Resolution => ({ key, resolution: 'resolution' + key }))
            resolve(resolvedArrayOfValues)
        }, 500)
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

