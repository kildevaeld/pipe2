/// <reference path="../typings/main.d.ts" />
import { Transform, Stream } from 'stream';
import * as vfs from 'vinyl-fs';
import { EventEmitter } from 'events';
export declare class Pipe2<T> extends Transform {
    static map: {
        json<T>(options?: any): (file: any) => Promise<T>;
        excel(options?: any): (file: any) => Promise<File>;
    };
    /**
     * Initialize new Pipe2 stream from an array
     */
    static array<T>(array: T[]): Pipe2<T>;
    /**
     * Initialize new Pipe2 stream a stream
     */
    static stream(stream?: Stream): Pipe2<any>;
    /**
     * Create a vinyl stream;
     */
    static src(path: string | string[], options?: vfs.ISrcOptions): Pipe2<File>;
    /**
     * Create a new stream from a generator function
     */
    static generator<T>(fn: IterableIterator<T>): Pipe2<T>;
    /**
     * Resolve promise and generate stream
     */
    static promise<T>(promise: Promise<T>): Pipe2<T>;
    constructor();
    _transform(chunk: any, enc: any, cb: any): void;
    /**
     * Map  stream
     * @param {Function} fn A function which takes 1 argument. Is expected to return a value or a promise which resolves to a value
     * @param {Function} flush An optional flush function called just before the stream ends.
     * @return {Pipe2}
     */
    map<U>(fn: (file: T) => (U | Promise<U>), flush?: () => any): Pipe2<U>;
    /**
     * Convert stream to a vinyl stream
     * @param {String|Function} filename
     * @return {Pipe2}
     */
    vinyl(filename: string | ((a: any) => string), basedir?: string): Pipe2<File>;
    /**
     * Convert values in the stream to buffers
     */
    buffer(escape?: boolean, options?: any): Pipe2<Buffer>;
    /**
     * Convert a stream to a json encoded buffer stream
     */
    json(options?: any): Pipe2<Buffer>;
    /** Wrap a standard stream
     * @param {Stream} stream
    */
    wrap(stream: Stream): Pipe2<any>;
    pipe<T extends EventEmitter>(stream: T, options?: any): T;
    /**
     * Wait for the stream to finish and return an array with the values
     */
    toArray(): Promise<T[]>;
    /**
     * Wait for the stream to finish and return a buffer
     */
    toBuffer(): Promise<Buffer>;
    /**
     * Write the stream to path and wait for it to finish.
     * You should make sure, that the stream is a vinyl stream
     * @param {String} path
     */
    toDest(path: string): Promise<void>;
    /**
     * Wait for the stream to finish
     */
    wait(): Promise<void>;
}
