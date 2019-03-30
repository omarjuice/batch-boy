import * as expect from 'expect'
import hello from './index'




describe('Testing function', () => {
    it('Should simulate asynchronous calls', done => {
        done()
    })
    it('Should say hello', () => {
        expect(hello('hello')).toBe('hello')
    })
})
