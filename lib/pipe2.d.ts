/// <reference path="../typings/main.d.ts" />
import { Transform, Readable } from 'stream';
export declare class Pipe2 extends Transform {
    static array(array: any[]): Pipe2;
    static stream(stream: Readable): Pipe2;
    static gene: any;
    static promise(promise: Promise<any>): Pipe2;
    constructor();
    _transform(chunk: any, enc: any, cb: any): void;
    map<T, U>(fn: (file: T) => Promise<U>): Pipe2;
    buffer(escape?: boolean, options?: any): Pipe2;
    json(options?: any): Pipe2;
    toArray<T>(): Promise<T>;
    toBuffer(): Promise<Buffer>;
    wait(): Promise<void>;
}
