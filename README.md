# batch-boy

Use batch-boy to batch asynchronous function calls.
It is a very light weight batching and caching utility that
lumps together load requests that occur close together in time.

An implementation of [Dataloader](https://github.com/graphql/dataloader).


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

// using the same instance of Batch to load data into functions that occur within the same event loop results in only one call to the database

```

The above is the typical use case for batch-boy.

**Note**: Any kind of processing or other logic can occur in the batching function. The only requirements are that it accepts an array of keys and returns a promise that resolves to an array of values.


## API

#### batcher.load(key: string | number) : Promise<any>
```javascript
const user = await batcher.load(1)
```
Returns a promise for a value.
***
#### batcher.loadMany(keys: key[]): Promise<any[]>
```javascript
const users = await batcher.loadMany([1,2,3,4,5])
```
Returns a promise for an array of values.
***
#### batcher.prime(key: string | number, value: any): Promise
```javascript
const [oj, billy] = await batcherByUsername.loadMany(['oj', 'billy'])
batcherByUserId.prime(1, oj)
batcherByUserId.prime(2, billy)
//...
const user2 = await batcherByUserId.load(2) //billy is already there!
```
Primes the cache of the batcher instance with the key and value and returns a promise for that value.
***
#### batcher.getFromCache(key: string | number): Promise<any>
```javascript
const dataFromCache = await batcher.getFromCache(5)
```
Returns a promise for a value in the batcher's cache.
_Does not_ refetch the data.
***
#### batcher.reload(key: string | number): Promise
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
#### batcher.clearCache() : Batch
```javascript
batcher.clearCache()
```
Clears the cache of the batcher. Returns the batcher for method chaining.
***
#### batcher.clearKey(key) : Batch
```javascript
batcher.clearKey(1)
```
Clears a specific key from the batcher. Returns the batcher for method chaining.
***
#### batcher.clearKeys(keys: key[]) : Batch
```javascript
batcher.clearKeys(['oj', 'billy'])
```
Clears multiple keys from the batcher. Returns the batcher for method chaining.


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