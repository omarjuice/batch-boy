import { IDeferred } from "./types";

export default class Deferred implements IDeferred {
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
