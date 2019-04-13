export default class Deferred {
	resolve: (resolution: any) => any
	reject: (rejection: Error) => any
	promise: Promise<any>
	constructor() {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve
			this.reject = reject
		})
	}
}
