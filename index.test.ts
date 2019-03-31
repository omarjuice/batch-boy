import * as expect from 'expect'
import * as sinon from 'sinon'
import Batch from './index'
import { Resolution, key } from './types'
import MockDB from './mockDB';
import { genResolution, arrayOfIntegers, timeBuffer } from './utils';


const Resolution = {
    key: expect.any(Number),
    resolution: expect.any(String)
}

const batchingFunction = async (keys: key[], db: MockDB, willThrow: boolean = false) => {
    const results = await db.query(keys, willThrow)
    const resultsMap = results.reduce((acc, item: Resolution) => {
        acc[item.key] = item
        return acc
    }, {})
    return keys.map(key => resultsMap[key])
}


describe('MockDB', () => {
    it('query returns a promise', () => {
        const db = new MockDB(100, 500, genResolution)
        expect(db.query([1])).toBeInstanceOf(Promise)
        db.stopExecution()
    })
    xit('demonstrates the problem', async () => {
        const db = new MockDB(100, 500, genResolution)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        await Promise.all([
            db.query([1]),
            db.query([2]),
            db.query([3]),
            db.query([4])])
        expect(spyOnDbExecute.callCount).toBe(4)
    })
})
describe('Batch', () => {
    it('Should batch calls to a function', async () => {
        const db = new MockDB(10, 100, genResolution)
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
        expect(spyOnDbExecute.callCount).toBe(1)
    })
    it('Should be able to perform multiple batches', async () => {
        const db = new MockDB(10, 100, genResolution)
        const batcher = new Batch(keys => batchingFunction(keys, db))
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const firstBatch = arrayOfIntegers(1, 4)
        await Promise.all(firstBatch.map(n => batcher.load(n)))
        await timeBuffer(100)
        expect(batcher.prevBatch).toEqual(firstBatch)
        const secondBatch = arrayOfIntegers(5, 7)
        await Promise.all(secondBatch.map(n => batcher.load(n)))
        expect(batcher.prevBatch).toEqual(secondBatch)
        expect(spyOnDbExecute.callCount).toBe(2)
    })
    it('Should cache repeated calls for the same key', () => {
        const db = new MockDB(10, 100, genResolution)
        const batcher = new Batch(keys => batchingFunction(keys, db))
        const promise1 = batcher.load(1)
        const promise2 = batcher.load(1)
        expect(promise1 === promise2).toBe(true)
        db.stopExecution()
    })
    it('Should cache subsequent calls for the same key', async () => {
        const db = new MockDB(10, 100, genResolution)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))
        await Promise.all([
            batcher.load(1),
            batcher.load(2),
            batcher.load(3),
            batcher.load(4),
        ])
        await timeBuffer(100)
        const result = await batcher.load(4)
        expect(result).toMatchObject({
            key: 4,
            resolution: 'resolution4'
        })
        expect(spyOnDbExecute.callCount).toBe(1)

    })
    it('Should work with string keys', async () => {
        const customKeys = ['oogabooga', 'fufu', 'lame', 'lol']
        const db = new MockDB(10, 100, genResolution, customKeys)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))
        const results = await Promise.all([batcher.load(customKeys[3]), batcher.load(customKeys[2]), batcher.load(customKeys[0])])
        for (let item of results) {
            expect(item).toMatchObject(genResolution(item.key))
        }
        expect(spyOnDbExecute.calledOnce).toBe(true)
    })
})
describe('Batch utility functions', () => {
    describe('loadMany', () => {
        it('Should load many keys at once', async () => {
            const db = new MockDB(10, 100, genResolution)
            const spyOnDbExecute = sinon.spy(db, '_execute')
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const results = await batcher.loadMany([1, 2, 3, 4])
            expect(results.length).toBe(4)
            for (let item of results) {
                expect(item).toMatchObject(Resolution)
            }
            expect(spyOnDbExecute.callCount).toBe(1)
        })
    })
    describe('clearCache', () => {
        it('Should clear the cache of existing values', async () => {
            const db = new MockDB(10, 100, genResolution)
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const spyOnDbExecute = sinon.spy(db, '_execute')
            await batcher.load(1)
            batcher.clearCache()
            await batcher.load(1)
            expect(spyOnDbExecute.callCount).toBe(2)
        })
    })
    describe('clearKeys', () => {
        it('Should clear the cache of specific keys', async () => {
            const db = new MockDB(10, 100, genResolution)
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const spyOnDbExecute = sinon.spy(db, '_execute')
            const firstBatch = arrayOfIntegers(1, 4)
            await Promise.all(firstBatch.map(n => batcher.load(n)))
            batcher.clearKeys(batcher.prevBatch)
            const secondBatch = arrayOfIntegers(5, 7)
            await Promise.all(secondBatch.map(n => batcher.load(n)))
            await Promise.all(firstBatch.map(n => batcher.load(n)))
            expect(batcher.prevBatch).toEqual(firstBatch)
            expect(spyOnDbExecute.callCount).toBe(3)
        })
    })
    describe('prime', () => {
        it('Should prime the cache of the batcher', async () => {
            const db = new MockDB(10, 100, genResolution)
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const spyOnDbExecute = sinon.spy(db, '_execute')
            const primeValue = { key: 9, resolution: 'SuperSecretValue' }
            batcher.prime(9, primeValue)
            const results: Resolution[] = await Promise.all([
                batcher.load(3),
                batcher.load(10),
                batcher.load(9),
                batcher.load(6)
            ])
            for (let result of results) {
                if (result.key === primeValue.key) {
                    expect(result).toMatchObject(primeValue)
                } else {
                    expect(result).toMatchObject(genResolution(result.key))
                }
            }
            expect(batcher.prevBatch.includes(primeValue.key)).toBe(false)
            expect(spyOnDbExecute.callCount).toBe(1)
        })
    })
})
describe('Error handling', () => {
    it('rejects errors normally', async () => {
        const db = new MockDB(10, 100, genResolution)
        const batcher = new Batch(keys => batchingFunction(keys, db, true))
        await expect(Promise.all(arrayOfIntegers(3, 6).map(n => batcher.load(n))))
            .rejects
            .toThrow(db.error)
    })
    it('Throws in try/catch', async () => {
        const db = new MockDB(10, 100, genResolution)
        const batcher = new Batch(keys => batchingFunction(keys, db, true))
        await expect(batcher.load(8))
            .rejects
            .toThrow(db.error)
    })
})

