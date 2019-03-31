import * as expect from 'expect'
import * as sinon from 'sinon'
import Batch from './index'
import { Resolution } from './types'
import MockDB from './mockDB';


// const mockAsync: MockAsync = (keys, time = 500) => {
//     console.log(keys)
//     return new Promise(resolve => {
//         let resolvedArrayOfValues: Resolution[];
//         setTimeout(() => {
//             resolvedArrayOfValues = keys.map((key: number): Resolution => ({ key, resolution: 'resolution' + key }))
//             resolve(resolvedArrayOfValues)
//         }, time)
//     })
// }
const Resolution = {
    key: expect.any(Number),
    resolution: expect.any(String)
}

const batchingFunction = async (keys, db) => {
    const results = await db.query(keys)
    const resultsMap = results.reduce((acc, item: Resolution) => {
        acc[item.key] = item
        return acc
    }, {})
    return keys.map(key => resultsMap[key])
}

describe('MockDB', () => {
    it('query return a promise', () => {
        const db = new MockDB(100, 500)
        expect(db.query([1])).toBeInstanceOf(Promise)
        db.stopExecution()
    })
    xit('demonstrates the problem', async () => {
        const db = new MockDB(100, 500)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        await Promise.all([
            db.query([1]),
            db.query([2]),
            db.query([3]),
            db.query([4])])
        expect(spyOnDbExecute.callCount).toBe(5)
    })
})
describe('Batch', () => {
    it('Should batch calls to a function', async () => {
        const db = new MockDB(10, 100)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))
        const results = await Promise.all([
            batcher.load(1),
            batcher.load(2),
            batcher.load(3),
            batcher.load(4),
        ])
        for (let item of results) {
            expect(item).toMatchObject(Resolution)
        }
        expect(spyOnDbExecute.callCount).toBe(2)
    })
    it('Should cache subsequent calls for the same key', async () => {
        const db = new MockDB(10, 100)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))
        await Promise.all([
            batcher.load(1),
            batcher.load(2),
            batcher.load(3),
            batcher.load(4),
        ])
        const result = await batcher.load(4)
        expect(result).toMatchObject({
            key: 4,
            resolution: 'resolution4'
        })
        expect(spyOnDbExecute.callCount).toBe(2)
    })
})

