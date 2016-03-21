/// <reference path="../typings/main.d.ts" />
"use strict";
const stream_1 = require('stream');
const es = require('event-stream');
const utils_1 = require('./utils');
const vinyl_fs_1 = require('vinyl-fs');
const Path = require('path');
const mappings = require('./map/index');
const through2 = require('through2');
const Promise = require('any-promise');
const File = require('vinyl');
const eos = require('end-of-stream');
function _wrap(fn) {
    let pipe = through2.obj(function (chunk, enc, callback) {
        console.log('HERE');
        Promise.resolve(fn.call(this, chunk)).then(data => callback(null, data))
            .catch(callback);
    });
    console.log('jeerere');
    return Pipe2.stream().pipe(pipe).pipe(Pipe2.stream());
}
exports.map = {
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
    static array(array) {
        let p = new Pipe2();
        return new utils_1.GenToStream(utils_1.arrayToGenerator(array)).pipe(p);
    }
    static stream(stream) {
        let p = new Pipe2();
        return stream != null ? stream.pipe(p) : p;
    }
    static src(path, options) {
        return Pipe2.stream(vinyl_fs_1.default.src(path, options));
    }
    static generator(fn) {
        let p = new Pipe2;
        return new utils_1.GenToStream(fn).pipe(p);
    }
    static promise(promise) {
        let pipe = new Pipe2();
        return utils_1.promiseToStream(promise).pipe(pipe);
    }
    _transform(chunk, enc, cb) {
        this.push(chunk, enc);
        cb();
    }
    map(fn, flush) {
        let p = new Pipe2();
        /*return this.pipe<Pipe2<U>>(<Pipe2<U>>es.map(function(file, cb) {
            Promise.resolve(fn(file)).then((data) => {
                cb(null, data);
            }).catch(cb);
        })).pipe(p);*/
        var self = this;
        return this.pipe(through2.obj(function (chunk, enc, cb) {
            Promise.resolve(fn.call(this, chunk)).then(data => cb(null, data))
                .catch((e) => {
                self.emit('error', e);
                throw e;
            });
        }, (cb) => {
            if (flush) {
                return Promise.resolve(flush.call(this)).then(() => cb(null))
                    .catch(cb);
            }
            cb();
        })).pipe(Pipe2.stream());
    }
    vinyl(filename, basedir) {
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
    wrap(stream) {
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
    toDest(path) {
        return this.wrap(vinyl_fs_1.default.dest(path)).wait();
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
Pipe2.map = exports.map;
exports.Pipe2 = Pipe2;
