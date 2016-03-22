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


const map = {
    json<T>(options?) {
        return mappings.JsonMapper<T>(options);
    },
    excel (options?) {
        return mappings.ExcelMap(options);
    }
};


export class Pipe2<T> extends Transform {
    static map = map;
    
    /**
     * Initialize new Pipe2 stream from an array
     */
    static array<T>(array: T[]): Pipe2<T> {
        let p = new Pipe2();
        return new GenToStream(arrayToGenerator(array)).pipe(p);
    }

    /**
     * Initialize new Pipe2 stream a stream
     */
    static stream(stream?: Stream): Pipe2<any> {
        let p = new Pipe2();
        // propagate error events downstream
        if (stream) stream.once('error', e => p.emit('error', e));
        
        return stream != null ? stream.pipe(p) : p;
    }

    /**
     * Create a vinyl stream;
     */
    static src(path: string | string[], options?: vfs.ISrcOptions): Pipe2<File> {
        return Pipe2.stream(<any>vfs.src(path, options));
    }

    /**
     * Create a new stream from a generator function
     */
    static generator<T>(fn:IterableIterator<T>): Pipe2<T> {
        let p = new Pipe2;
        return new GenToStream(fn).pipe(p);
    }
    
    /**
     * Resolve promise and generate stream
     */
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

    /**
     * Map  stream
     * @param {Function} fn A function which takes 1 argument. Is expected to return a value or a promise which resolves to a value
     * @param {Function} flush An optional flush function called just before the stream ends.
     * @return {Pipe2} 
     */
    map<U>(fn: (file: T) => (U|Promise<U>), flush?:() => any): Pipe2<U> {

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
    
    /**
     * Convert stream to a vinyl stream
     * @param {String|Function} filename
     * @return {Pipe2}
     */
    vinyl(filename: string | ((a: any) => string), basedir?: string): Pipe2<File> {
        let index = 0;
        return this.map<File>((file): any => {
            if (!(file instanceof File)) {
                if (!Buffer.isBuffer(file) || !(file instanceof Stream)) {
                    if (typeof file !== 'string') {
                        file = <any>JSON.stringify(file);
                    }
                    file = <any>new Buffer(<any>file);
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

    /**
     * Convert values in the stream to buffers
     */
    buffer(escape?: boolean, options?): Pipe2<Buffer> {
        escape = escape || false
        options = options || {};

        return this.map<Buffer>((file: any) => {

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

    /**
     * Convert a stream to a json encoded buffer stream
     */
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

    /** Wrap a standard stream 
     * @param {Stream} stream 
    */
    wrap (stream:Stream): Pipe2<any> {
        return this.pipe(Pipe2.stream(stream));
    }
    
    pipe<T extends EventEmitter>(stream: T, options?:any): T {
        //stream.once('error', e => this.emit('error', e));
        this.once('error', e => stream.emit('error', e));
        return super.pipe(<any>stream, options);
    }

    /** 
     * Wait for the stream to finish and return an array with the values
     */
    toArray(): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
            this.pipe(<any>es.writeArray((e, b) => {
                if (e) return reject(e);
                resolve(b);
            }));
        });
    }

    /**
     * Wait for the stream to finish and return a buffer
     */
    toBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
            this.pipe(<any>es.wait((e, b) => {
                if (e) return reject(e);
                return resolve(b);
            }));
        });
    }

    /**
     * Write the stream to path and wait for it to finish.
     * You should make sure, that the stream is a vinyl stream
     * @param {String} path
     */
    toDest(path:string): Promise<void> {
        return this.wrap(vfs.dest(path)).wait();
    }

    /**
     * Wait for the stream to finish
     */
    wait(): Promise<void> {
        return new Promise((resolve, reject) => {
            eos(this, (e) => {
                if (e) return reject(e);
                return resolve();
            });
        });
    }

}


