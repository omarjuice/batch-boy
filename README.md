# batch-boy

Use batch-boy to batch asynchronous function calls.
It is a very light weight batching and caching utility that
lumps together load requests that occur close together in time.

An implementation of [Dataloader](https://github.com/graphql/dataloader).

[A major difference between batch-boy and Dataloader.](#a-major-difference-from-dataloader)


## Installation
```
npm install batch-boy --save
```


## Usage

```javascript
const Batch = require('batch-boy')

const batchingFucntion = async keys => {
    const data = await database.query(
        'Some query that returns an array of data',
        keys);
    const dataAsObject = data.reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
    }, {})
    return keys.map(key => dataAsObject[key] || {})
}

const batcher = new Batch(keys => batchingFunction(keys))

const funcThatNeedsData = async () => {
    //...important logic
    const itemOne = await batcher.load(1)
    //...more logic with itemOne
}
const anotherFuncThatNeedsData = async () => {
    //...stuff
    const itemTwo = await batcher.load(2)
    //...stuff to do with itemTwo
}

funcThatNeedsData()
anotherFuncThatNeedsData()

// using the same instance of Batch to load data into functions that 
// occur within the same event loop results in only one 
// call to the database

```

The above is the typical use case for batch-boy.

**Note**: Any kind of processing or other logic can occur in the batching function. The only requirements are that it accepts an array of keys and returns a promise that resolves to an array of values.

We are using `keys.map` at the return of the function because `Batch` assumes that the values returned correspond to the keys passed in.


Not only that, but corresponding data for a specific key is never guaranteed, so we must control for that by returning some kind of value for keys that dont have corresponding data. 

We use `data.reduce` before that to place the data into an object so that map can do its thing. 

If you want keys that dont get mapped to corresponding data to be refetched next time `batcher.load` is called, we could simply assign the key to a falsy value. Otherwise, we give such a key an object or some other truthy value. Then the data can only be refetched with `batcher.reload`.




## API

#### `batcher.load(key: string | number) : Promise<any>`
```javascript
const user = await batcher.load(1)
```
Returns a promise for a value.
***
#### `batcher.loadMany(keys: key[]): Promise<any[]>`
```javascript
const users = await batcher.loadMany([1,2,3,4,5])
```
Returns a promise for an array of values.
***
#### `batcher.prime(key: string | number, value: any): Promise<any>`
```javascript
const [oj, billy] = await batcherByUsername.loadMany(['oj', 'billy'])
batcherByUserId.prime(1, oj)
batcherByUserId.prime(2, billy)
//...
const user2 = await batcherByUserId.load(2) //billy is already there!
```
Primes the cache of the batcher instance with the key and value and returns a promise for that value.
***
#### `batcher.getFromCache(key: string | number): Promise<any> | null`
```javascript
const dataFromCache = await batcher.getFromCache(5)
```
Returns a promise for a value in the batcher's cache. Returns null if a value for the provided key is not found or is falsy.
_Does not_ refetch the data.
***
#### `batcher.reload(key: string | number): Promise<any>`
```javascript
const refetchedItem = await batcher.reload(5)
```
Refetches data that is in the cache. Return a promise for said data.
***
#### batcher.reloadMany(keys: key[]): Promise<any[]>
```javascript
const refetchedItems = await batcher.reloadMany([1,2,3,4,5])
```
Accepts an array of keys and reloads many.

***
#### `batcher.clearCache() : Batch`
```javascript
batcher.clearCache()
```
Clears the cache of the batcher. Returns the batcher for method chaining.
***
#### `batcher.clearKey(key) : Batch`
```javascript
batcher.clearKey(1)
```
Clears a specific key from the batcher. Returns the batcher for method chaining.
***
#### `batcher.clearKeys(keys: key[]) : Batch`
```javascript
batcher.clearKeys(['oj', 'billy'])
```
Clears multiple keys from the batcher. Returns the batcher for method chaining.
#### `batcher.ongoingJobsEnableQueueing(bool: boolean = true) : Batch`
```javascript
batcher.ongoingJobsEnableQueueing(false)
```
Calling with false makes it so that the batcher does not wait for the previous job to finish before dispatching the next job.
[See below for in-depth explanation.](#a-major-difference-from-dataloader)

## Patterns
It is suggested that `Batch` is used on a per request basis, because caching data at an application level can have problematic effects if unmanaged.

_However_, it is possible to use only one instance of each batcher if only the reload functions are used. This would allow for the possibility of using batch-boy for batching data fetching only, and not caching. 

The reload methods were something I thought were missing from the Dataloader API as a direct way to refetch data already the cache. The reload methods are primarily intended for cases in which it is known that data has changed or will change:

```javascript
const user = await batcher.load(1)
await db.query(`UPDATE users SET username='oj' WHERE id=?`, [1])


// somewhere else in our code
const updatedUser = await batcher.reload(1) //updated user!
```
It is worth noting that this can also be achieved by calling `batcher.clearKey` before a `batcher.load`. But why write extra code when this convenient API has got you covered...


### A major difference from dataloader

While one batch is being processed, by default, requests for another batch on the same batcher will not be run until the previous batch has returned.

Notice that while another batch is being processed, batcher queues calls to `batcher.load` that occur within the timeframe of the currently executing process, not just during the same event loop. For most use cases, this is ideal for single SQL database querying because they can only run one process at a time as it results in less trips to the database.

This behavior may be sometimes undesired, so control is given to the user with `batcher.ongoingJobsEnableQueuing(boolean)`. By default, this is true, resulting the the aforementioned behavior, but calling this method with false will result in a similar execution pattern to Dataloader's.
Tests run demonstrating this behavior:

```javascript
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
```