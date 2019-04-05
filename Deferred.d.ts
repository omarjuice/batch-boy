export interface IDeferred {
    resolve: (resolution: any) => any;
    reject: (rejection: Error) => any;
    promise: Promise<any>;
}
export default class Deferred implements IDeferred {
    resolve: (resolution: any) => any;
    reject: (rejection: Error) => any;
    promise: Promise<any>;
    constructor();
}
