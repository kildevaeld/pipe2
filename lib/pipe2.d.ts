/// <reference path="../typings/main.d.ts" />
import { Transform, Stream } from 'stream';
import vfs from 'vinyl-fs';
import Vinyl from 'vinyl';
export declare const map: {
    json(options?: any): (file: any) => Promise<any>;
    excel(options?: any): (file: any) => Promise<Vinyl>;
};
export declare class Pipe2<T> extends Transform {
    static map: {
        json(options?: any): (file: any) => Promise<any>;
        excel(options?: any): (file: any) => Promise<Vinyl>;
    };
    static array<T>(array: T[]): Pipe2<T>;
    static stream(stream?: Stream): Pipe2<any>;
    static src(path: string | string[], options?: vfs.ISrcOptions): Pipe2<File>;
    static generator<T>(fn: IterableIterator<T>): Pipe2<T>;
    static promise<T>(promise: Promise<T>): Pipe2<T>;
    constructor();
    _transform(chunk: any, enc: any, cb: any): void;
    map<T, U>(fn: (file: T) => Promise<U>): Pipe2<U>;
    vinyl(filename: string | ((a: any) => string), basedir?: string): Pipe2<File>;
    buffer(escape?: boolean, options?: any): Pipe2<Buffer>;
    json(options?: any): Pipe2<any>;
    wrap(stream: Stream): Pipe2<any>;
    toArray(): Promise<T[]>;
    toBuffer(): Promise<Buffer>;
    toDest(path: string): Promise<void>;
    wait(): Promise<void>;
}
