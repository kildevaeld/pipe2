/// <reference path="../typings/main.d.ts" />
"use strict";
const stream_1 = require('stream');
const es = require('event-stream');
const utils_1 = require('./utils');
const vfs = require('vinyl-fs');
const Path = require('path');
const mappings = require('./map/index');
const through2 = require('through2');
const Promise = require('any-promise');
const File = require('vinyl');
const eos = require('end-of-stream');
const map = {
    json(options) {
        return mappings.JsonMapper(options);
    },
    excel(options) {
        return mappings.ExcelMap(options);
    }
};
class Pipe2 extends stream_1.Transform {
    constructor() {
        super({ objectMode: true });
    }
    /**
     * Initialize new Pipe2 stream from an array
     */
    static array(array) {
        let p = new Pipe2();
        return new utils_1.GenToStream(utils_1.arrayToGenerator(array)).pipe(p);
    }
    /**
     * Initialize new Pipe2 stream a stream
     */
    static stream(stream) {
        let p = new Pipe2();
        // propagate error events downstream
        if (stream)
            stream.once('error', e => p.emit('error', e));
        return stream != null ? stream.pipe(p) : p;
    }
    /**
     * Create a vinyl stream;
     */
    static src(path, options) {
        return Pipe2.stream(vfs.src(path, options));
    }
    /**
     * Create a new stream from a generator function
     */
    static generator(fn) {
        let p = new Pipe2;
        return new utils_1.GenToStream(fn).pipe(p);
    }
    /**
     * Resolve promise and generate stream
     */
    static promise(promise) {
        let pipe = new Pipe2();
        return utils_1.promiseToStream(promise).pipe(pipe);
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
    map(fn, flush) {
        let out = new Pipe2();
        /*return this.pipe<Pipe2<U>>(<Pipe2<U>>es.map(function(file, cb) {
            Promise.resolve(fn(file)).then((data) => {
                cb(null, data);
            }).catch(cb);
        })).pipe(p);*/
        var self = this;
        let pipe = this.pipe(through2.obj(function (chunk, enc, cb) {
            Promise.resolve(fn.call(this, chunk)).then(data => cb(null, data))
                .catch((e) => {
                self.emit('error', e);
            });
        }, (cb) => {
            if (flush) {
                return Promise.resolve(flush.call(this))
                    .then(() => cb())
                    .catch(cb);
            }
            cb();
        })); //.pipe(Pipe2.stream());
        // propagate error events downstream
        pipe.once('error', e => out.emit('error', e));
        return pipe.pipe(out);
    }
    /**
     * Convert stream to a vinyl stream
     * @param {String|Function} filename
     * @return {Pipe2}
     */
    vinyl(filename, basedir) {
        let index = 0;
        return this.map((file) => {
            if (!(file instanceof File)) {
                if (!Buffer.isBuffer(file) || !(file instanceof stream_1.Stream)) {
                    if (typeof file !== 'string') {
                        file = JSON.stringify(file);
                    }
                    file = new Buffer(file);
                }
                var opts = {
                    contents: file
                };
                if (filename)
                    opts.path = Path.resolve(basedir || process.cwd(), filename);
                if (basedir)
                    opts.base = basedir;
                file = new File(opts);
            }
            return file;
        });
    }
    /**
     * Convert values in the stream to buffers
     */
    buffer(escape, options) {
        escape = escape || false;
        options = options || {};
        return this.map((file) => {
            if (file instanceof File) {
                if (file.isBuffer() || file.isNull()) {
                    return Promise.resolve(file);
                }
                else if (file.isStream()) {
                    return Pipe2.stream(file.contents).toBuffer();
                }
            }
            else if (Buffer.isBuffer(file)) {
                return Promise.resolve(file);
            }
            else if (file instanceof stream_1.Stream) {
                return Pipe2.stream(file).toBuffer();
            }
            else if (typeof file === 'string' && escape === false) {
                return Promise.resolve(new Buffer(file));
            }
            else {
                if (file == null)
                    return Promise.resolve(null);
                let buffer = new Buffer(JSON.stringify(file, null, options.identSize || 1));
                return Promise.resolve(buffer);
            }
        });
    }
    /**
     * Convert a stream to a json encoded buffer stream
     */
    json(options) {
        let out = false;
        let stream = this.buffer(true, options).pipe(es.through(function (chunk, enc, callback) {
            if (out === false) {
                this.emit('data', new Buffer('['));
                out = true;
            }
            else {
                this.emit('data', new Buffer(','));
            }
            this.emit('data', chunk);
        }, function (cb) {
            if (!out) {
                this.emit('data', new Buffer('[]'));
            }
            else {
                this.emit('data', new Buffer(']'));
            }
            this.emit('end');
        }));
        return Pipe2.stream(stream);
    }
    /** Wrap a standard stream
     * @param {Stream} stream
    */
    wrap(stream) {
        return this.pipe(Pipe2.stream(stream));
    }
    pipe(stream, options) {
        //stream.once('error', e => this.emit('error', e));
        this.once('error', e => stream.emit('error', e));
        return super.pipe(stream, options);
    }
    /**
     * Wait for the stream to finish and return an array with the values
     */
    toArray() {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
            this.pipe(es.writeArray((e, b) => {
                if (e)
                    return reject(e);
                resolve(b);
            }));
        });
    }
    /**
     * Wait for the stream to finish and return a buffer
     */
    toBuffer() {
        return new Promise((resolve, reject) => {
            this.once('error', e => reject(e));
            this.pipe(es.wait((e, b) => {
                if (e)
                    return reject(e);
                return resolve(b);
            }));
        });
    }
    /**
     * Write the stream to path and wait for it to finish.
     * You should make sure, that the stream is a vinyl stream
     * @param {String} path
     */
    toDest(path) {
        return this.wrap(vfs.dest(path)).wait();
    }
    /**
     * Wait for the stream to finish
     */
    wait() {
        return new Promise((resolve, reject) => {
            eos(this, (e) => {
                if (e)
                    return reject(e);
                return resolve();
            });
        });
    }
}
Pipe2.map = map;
exports.Pipe2 = Pipe2;
