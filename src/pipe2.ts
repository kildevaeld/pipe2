/// <reference path="../typings/main.d.ts" />

import {Transform, Readable, Stream} from 'stream';
import * as es from 'event-stream';
import {promiseToStream, GenToStream, arrayToGenerator} from './utils';
import * as vfs from 'vinyl-fs'
import * as Path from 'path';
import * as mappings from './map/index';
import Vinyl from 'vinyl';
import * as through2 from 'through2'
import {EventEmitter} from 'events';
const Promise = require('any-promise');
const File = require('vinyl');
const eos = require('end-of-stream');


function _wrap<T>(fn: (file:any) => Promise<T>): Pipe2<T> {
    let pipe = through2.obj(function (chunk, enc, callback) {
        Promise.resolve(fn.call(this, chunk)).then( data => callback(null, data) )
        .catch(callback);
    });

    return Pipe2.stream().wrap(pipe)//Pipe2.stream().pipe(pipe).pipe(Pipe2.stream());
}

export const map = {
    json<T>(options?) {
        return mappings.JsonMapper<T>(options);
    },
    excel (options?) {
        return mappings.ExcelMap(options);
    }
};


export class Pipe2<T> extends Transform {
    static map = map;
    static array<T>(array: T[]): Pipe2<T> {
        let p = new Pipe2();
        return new GenToStream(arrayToGenerator(array)).pipe(p);
    }

    static stream(stream?: Stream): Pipe2<any> {
        let p = new Pipe2();
        // propagate error events downstream
        if (stream) stream.once('error', e => p.emit('error', e));
        
        return stream != null ? stream.pipe(p) : p;
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

    map<T, U>(fn: (file: T) => any, flush?:() => any): Pipe2<U> {

        let out = new Pipe2();
        /*return this.pipe<Pipe2<U>>(<Pipe2<U>>es.map(function(file, cb) {
            Promise.resolve(fn(file)).then((data) => {
                cb(null, data);
            }).catch(cb);
        })).pipe(p);*/
        var self = this;
        let pipe = this.pipe<Pipe2<U>>(<any>through2.obj(function (chunk, enc, cb) {
            Promise.resolve(fn.call(this, chunk)).then( data => cb(null, data) )
            .catch((e) => {
                self.emit('error', e);
            });
        }, (cb) => {
            if (flush) {
                return Promise.resolve(flush.call(this))
                .then( () => cb() )
                .catch(cb);
            }
            cb();

        })) //.pipe(Pipe2.stream());
        
        // propagate error events downstream
        pipe.once('error', e => out.emit('error', e) );
        
        return pipe.pipe(out);
        
    }

    vinyl(filename: string | ((a: any) => string), basedir?: string): Pipe2<File> {
        return this.map<any,File>((file): any => {
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

    json(options?): Pipe2<Buffer> {
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

    pipe<T extends EventEmitter>(stream: T, options?:any): T {
        //stream.once('error', e => this.emit('error', e));
        this.once('error', e => stream.emit('error', e));
        return super.pipe(<any>stream, options);
    }


    toArray(): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
            this.pipe(<any>es.writeArray((e, b) => {
                if (e) return reject(e);
                resolve(b);
            }));
        });
    }

    toBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
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
        return new Promise((resolve, reject) => {
            eos(this, (e) => {
                if (e) return reject(e);
                return resolve();
            });
        });
    }

}


