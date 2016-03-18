/// <reference path="../typings/main.d.ts" />

import {Transform, Readable, Stream} from 'stream';
import * as es from 'event-stream';
import {promiseToStream, GenToStream, arrayToGenerator} from './utils';
import vfs from 'vinyl-fs'
import * as Path from 'path';
import * as mappings from './map/index';

const eos = require('end-of-stream'),
    File = require('vinyl');


export const map = {
    json (options?) {
        return mappings.JsonMapper(options);
    },
    
    excel (options?) {
        return mappings.ExcelMap(options);
    }
}

export class Pipe2<T> extends Transform {
    static map = map;
    static array<T>(array: T[]): Pipe2<T> {
        let p = new Pipe2();
        return new GenToStream(arrayToGenerator(array)).pipe(p);
    }

    static stream(stream: Stream): Pipe2<any> {
        let p = new Pipe2();
        return stream.pipe(p);
    }

    static src(path: string | string[], options?: vfs.ISrcOptions): Pipe2<File> {
        return Pipe2.stream(<any>vfs.src(path, options));
    }

    static generator<T>(fn:IterableIterator<T>): Pipe2<T> {
        let p = new Pipe2;
        return new GenToStream(fn).pipe(p);
    }

    static promise<T>(promise: Promise<T>): Pipe2<T> {
        let pipe = new Pipe2();
        return promiseToStream(promise).pipe(pipe);
    }
    

    constructor() {
        super({ objectMode: true });
    }

    _transform(chunk, enc, cb) {
        this.push(chunk, enc);
        cb();
    }

    map<T, U>(fn: (file: T) => Promise<U>): Pipe2<U> {
        let p = new Pipe2();

        return this.pipe<Pipe2<U>>(<Pipe2<U>>es.map(function(file, cb) {
            fn(file).then((data) => {
                cb(null, data);
            }).catch(cb);
        })).pipe(p);
    }

    vinyl(filename: string | ((a: any) => string), basedir?: string): Pipe2<File> {
        return this.map<any,File>(async (file): Promise<File> => {
            if (!(file instanceof File)) {
                if (!Buffer.isBuffer(file) || !(file instanceof Stream)) {
                    if (typeof file !== 'string') {
                        file = JSON.stringify(file);
                    }
                    file = new Buffer(file);
                }
                
                var opts: any = {
                    contents: file
                };

                if (filename) opts.path = Path.resolve(basedir || process.cwd(), filename);
                if (basedir) opts.base = basedir;

                file = new File(opts);
            }

            return file;
        });
    }

    buffer(escape?: boolean, options?): Pipe2<Buffer> {
        escape = escape || false
        options = options || {};

        return this.map((file: any): Promise<Buffer> => {

            if (file instanceof File) {
                if (file.isBuffer() ||  file.isNull()) {
                    return Promise.resolve(file);
                } else if (file.isStream()) {
                    return Pipe2.stream(file.contents).toBuffer();
                }
            } else if (Buffer.isBuffer(file)) {
                return Promise.resolve(file);
            } else if (file instanceof Stream) {
                return Pipe2.stream(file).toBuffer();

            } else if (typeof file === 'string' && escape === false) {
                return Promise.resolve(new Buffer(file));
            } else {

                if (file == null) return Promise.resolve(null);
                let buffer = new Buffer(JSON.stringify(file, null, options.identSize || 1))
                return Promise.resolve(buffer);

            }
        });
    }

    json(options?): Pipe2<any> {
        let out = false;

        let stream = this.buffer(true, options).pipe(es.through(function(chunk, enc, callback) {
            if (out === false) {
                this.emit('data', new Buffer('['));
                out = true;
            } else {
                this.emit('data', new Buffer(','));
            }
            this.emit('data', chunk);

        }, function(cb) {
            if (!out) {
                this.emit('data', new Buffer('[]'));
            } else {
                this.emit('data', new Buffer(']'));
            }
            this.emit('end');
        }));

        return Pipe2.stream(stream);
    }
    
    wrap (stream:Stream): Pipe2<any> {
        return Pipe2.stream(stream);
    }


    toArray(): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.pipe(<any>es.writeArray((e, b) => {
                if (e) return reject(e);
                resolve(b);
            }));
        });
    }

    toBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.pipe(<any>es.wait((e, b) => {
                if (e) return reject(e);
                return resolve(b);
            }));
        });
    }
    
    toDest(path:string): Promise<void> {
        return this.wrap(vfs.dest(path)).wait();
    }

    wait(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            eos(this, (e) => {
                if (e) return reject(e);
                return resolve();
            });
        });
    }

}


