import * as expect from 'expect'
import * as sinon from 'sinon'
import Batch from '../src/index'
import * as Dataloader from 'dataloader'
import { Resolution, key } from '../src/types'
import MockDB from './mockDB';
import { genResolution, arrayOfIntegers, timeBuffer } from './utils';


const Resolution = {
    key: expect.any(Number),
    resolution: expect.any(String)
}

const batchingFunction = async (keys, db: MockDB) => {
    const results = await db.query(keys)
    const resultsMap = results.reduce((acc, item: Resolution) => {
        if (item) {
            acc[item.key] = item
            return acc
        }
        return acc
    }, {})
    return keys.map(key => resultsMap[key] ? resultsMap[key] : null)
}


describe('MockDB', () => {
    it('query returns a promise', () => {
        const db = new MockDB(100, 500, genResolution)
        expect(db.query([1])).toBeInstanceOf(Promise)
        db.stopExecution()
    })
    it('demonstrates the problem', async () => {
        const db = new MockDB(100, 100, genResolution)
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
    describe('reload', () => {
        it('Should reload keys already loaded before', async () => {
            const db = new MockDB(10, 100, genResolution)
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const spyOnDbExecute = sinon.spy(db, '_execute')
            await Promise.all(arrayOfIntegers(3, 7).map(n => batcher.load(n)))
            expect(spyOnDbExecute.callCount).toBe(1)
            const result = await batcher.reload(1)
            expect(result).toMatchObject(genResolution(result.key))
            expect(spyOnDbExecute.callCount).toBe(2)
        })
    })
    describe('reloadMany', () => {
        it('Should reload many keys', async () => {
            const db = new MockDB(10, 100, genResolution)
            const batcher = new Batch(keys => batchingFunction(keys, db))
            const spyOnDbExecute = sinon.spy(db, '_execute')
            await Promise.all(arrayOfIntegers(3, 7).map(n => batcher.load(n)))
            expect(spyOnDbExecute.callCount).toBe(1)
            const results = await batcher.reloadMany([4, 6])
            for (let result of results) {
                expect(result).toMatchObject(genResolution(result.key))
            }
            expect(spyOnDbExecute.callCount).toBe(2)
        })
    })
})
describe('Error handling', () => {
    it('rejects errors normally', async () => {
        const db = new MockDB(10, 100, genResolution).throwsException(true)
        const batcher = new Batch(keys => batchingFunction(keys, db))
        await expect(Promise.all(arrayOfIntegers(3, 6).map(n => batcher.load(n))))
            .rejects
            .toThrow(db.error)
    })
    it('Throws in try/catch', async () => {
        const db = new MockDB(10, 100, genResolution).throwsException(true)
        const batcher = new Batch(keys => batchingFunction(keys, db))
        await expect(batcher.load(8))
            .rejects
            .toThrow(db.error)
    })
    it('Should not cache errors', async () => {
        const db = new MockDB(10, 100, genResolution).throwsException(true)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))
        await expect(batcher.load(8))
            .rejects
            .toThrow(db.error)
        expect(batcher.getFromCache(8)).toBe(null)
        db.throwsException(false)
        await batcher.load(8)
        expect(await batcher.getFromCache(8)).toEqual(genResolution(8))
        expect(spyOnDbExecute.callCount).toBe(2)
    })
    it('Can load null values', async () => {
        const db = new MockDB(10, 100, genResolution)
        const batcher = new Batch(keys => batchingFunction(keys, db))
        const result = await batcher.load(11)
        expect(result).toBe(null)
    })
})
describe('Test batch queueing', () => {
    it('ongoingJobsEnableQueueing(true) Should queue async calls while another batch is being processed', async () => {

        const db = new MockDB(10, 100, genResolution)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batcher = new Batch(keys => batchingFunction(keys, db))

        //perform initial loading
        const item1 = batcher.load(1)
            .then(() => {
                expect(batcher.prevBatch).toEqual([1])
                expect(spyOnDbExecute.callCount).toBe(1)
            })
        // while that is being processed, more load requests come in
        await timeBuffer(25)
        const item2 = batcher.load(2)
        await timeBuffer(25)
        const item3 = batcher.load(3)
        await timeBuffer(25)
        const item4 = batcher.load(4)
            .then(() => {
                expect(batcher.prevBatch).toEqual([2, 3, 4]);
                expect(spyOnDbExecute.callCount).toBe(2)
            })
        await timeBuffer(25)
        /* because the database execution of 100 ms finished before the load request of the next call,
            the next call is added to the next batch*/
        const item5 = batcher.load(5)
        const item6 = batcher.load(6)
            .then(() => {
                expect(batcher.prevBatch).toEqual([5, 6])
            })

        await (Promise.all([item1, item2, item3, item4, item5, item6]))
        //results in 3 total calls
        const { callCount } = spyOnDbExecute
        expect(callCount).toBe(3)
        console.log('batch-boy(ongoingJobsEnableQueueing(true)): ', callCount + ' calls')
    })
    it('dataloader does not queue async calls while another batch is being processed', async () => {
        const db = new MockDB(10, 100, genResolution)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const dataloader = new Dataloader(keys => batchingFunction(keys, db))

        const item1 = dataloader.load(1)
        await timeBuffer(25)
        const item2 = dataloader.load(2)
        await timeBuffer(25)
        const item3 = dataloader.load(3)
        await timeBuffer(25)
        const item4 = dataloader.load(4)
        await timeBuffer(25)
        const item5 = dataloader.load(5)
        const item6 = dataloader.load(6)
        await (Promise.all([item1, item2, item3, item4, item5, item6]))
        //results in 5 total calls
        const { callCount } = spyOnDbExecute
        expect(callCount).toBe(5)
        console.log('dataloader: ', callCount + ' calls')
    })
    it('ongoinJobsEnableQueueing(false) disables batch queueing for the next job', async () => {
        const db = new MockDB(10, 100, genResolution)
        const spyOnDbExecute = sinon.spy(db, '_execute')
        const batch = new Batch(keys => batchingFunction(keys, db)).ongoingJobsEnableQueueing(false)

        const item1 = batch.load(1)
        await timeBuffer(25)
        const item2 = batch.load(2)
        await timeBuffer(25)
        const item3 = batch.load(3)
        await timeBuffer(25)
        const item4 = batch.load(4)
        await timeBuffer(25)
        const item5 = batch.load(5)
        const item6 = batch.load(6)
        await (Promise.all([item1, item2, item3, item4, item5, item6]))
        //results in 5 total calls, like Dataloader
        const { callCount } = spyOnDbExecute
        expect(callCount).toBe(5)
        console.log('batch-boy(ongoingJobsEnableQueueing(false)): ', callCount + ' calls')
    })
})

