import { IDeferred } from './Deferred';
export declare type Cache = {
    [key: string]: IDeferred;
};
export declare type key = string | number;
export declare type BatchingFunction = (keys: any[]) => Promise<any[]>;
