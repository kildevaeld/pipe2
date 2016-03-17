import { Readable } from 'stream';
export declare class GenToStream extends Readable {
    private generator;
    constructor(generator: IterableIterator<any>);
    _read(size: number): void;
}
export declare function arrayToGenerator(n: any): IterableIterator<any>;
export declare function promiseToStream(promise: Promise<any>): Readable;
