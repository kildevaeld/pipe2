/// <reference path="../typings/main.d.ts" />
"use strict";
const stream_1 = require('stream');
const es = require('event-stream');
const utils_1 = require('./utils');
const eos = require('end-of-stream'), File = require('vinyl');
class Pipe2 extends stream_1.Transform {
    constructor() {
        super({ objectMode: true });
    }
    static array(array) {
        let p = new Pipe2();
        return new utils_1.GenToStream(utils_1.arrayToGenerator(array)).pipe(p);
    }
    static stream(stream) {
        let p = new Pipe2();
        return stream.pipe(p);
    }
    static promise(promise) {
        let pipe = new Pipe2();
        return utils_1.promiseToStream(promise).pipe(pipe);
    }
    _transform(chunk, enc, cb) {
        this.push(chunk, enc);
        cb();
    }
    map(fn) {
        let p = new Pipe2();
        return this.pipe(es.map(function (file, cb) {
            fn(file).then((data) => {
                cb(null, data);
            }).catch(cb);
        })).pipe(p);
    }
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
    toArray() {
        return new Promise((resolve, reject) => {
            this.pipe(es.writeArray((e, b) => {
                if (e)
                    return reject(e);
                resolve(b);
            }));
        });
    }
    toBuffer() {
        return new Promise((resolve, reject) => {
            this.pipe(es.wait((e, b) => {
                if (e)
                    return reject(e);
                return resolve(b);
            }));
        });
    }
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
exports.Pipe2 = Pipe2;
