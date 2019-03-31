import * as expect from 'expect'
import * as sinon from 'sinon'
import Batch from './index'
import { Resolution } from './types'
import MockDB from './mockDB';
import { genResolution, arrayOfIntegers, timeBuffer } from './utils';


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
        expect(spyOnDbExecute.callCount).toBe(5)
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
        const spyOnDispatch = sinon.spy(batcher, '_dispatch')
        const firstBatch = arrayOfIntegers(1, 4)
        await Promise.all(firstBatch.map(n => batcher.load(n)))
        await timeBuffer(100)
        expect(batcher.prevBatch).toEqual(firstBatch)
        const secondBatch = arrayOfIntegers(5, 7)
        await Promise.all(secondBatch.map(n => batcher.load(n)))
        expect(batcher.prevBatch).toEqual(secondBatch)
        expect(spyOnDbExecute.callCount).toBe(2)
        expect(spyOnDispatch.callCount).toBe(2)
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

