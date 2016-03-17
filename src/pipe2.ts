/// <reference path="../typings/main.d.ts" />

import {Transform, Readable, Stream} from 'stream';
import * as es from 'event-stream';
import {promiseToStream, GenToStream, arrayToGenerator} from './utils';

const eos = require('end-of-stream'),
  File = require('vinyl');


export class Pipe2 extends Transform {

  static array (array: any[]): Pipe2 {
    let p = new Pipe2();
    return new GenToStream(arrayToGenerator(array)).pipe(p);
  }

  static stream(stream: Readable): Pipe2 {
    let p = new Pipe2();
    return stream.pipe(p);
  }

  static gene

  static promise(promise:Promise<any>): Pipe2 {
    let pipe = new Pipe2();
    return promiseToStream(promise).pipe(pipe);
  }

  constructor() {
    super({objectMode: true});   
  }

  private _transform (chunk, enc, cb) {
    this.push(chunk, enc);
    cb();
  }

  map<T, U>(fn: (file:T) => Promise<U>): Pipe2 {
    let p = new Pipe2();

    return this.pipe<Pipe2>(<Pipe2>es.map(function (file, cb) {
      fn(file).then((data) => {
        cb(null, data);
      }).catch(cb);
    })).pipe(p);
  }

  buffer(escape?: boolean, options?): Pipe2 {
    escape = escape||false
    options = options||{};

    return this.map((file:any): Promise<Buffer> => {

      if (file instanceof File) {
        if (file.isBuffer() || file.isNull()) {
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
        let buffer = new Buffer(JSON.stringify(file, null, options.identSize||1))
        return Promise.resolve(buffer);

      }
    });
  }

  json(options): Pipe2 {
    let out = false;

    let stream = this.buffer(true, options).pipe(es.through( function (chunk, enc , callback) {
      if (out === false) {
        this.emit('data', new Buffer('['));
        out = true;
      } else {
        this.emit('data', new Buffer(','));
      }
      this.emit('data', chunk);

    }, function (cb) {
      if (!out) {
        this.emit('data', new Buffer('[]'));
      } else {
        this.emit('data',new Buffer(']'));
      }
      this.emit('end');
    }));

    return Pipe2.stream(stream);
  }


  toArray<T>(): Promise<T> {
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

  wait(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      eos(this, (e) => {
        if (e) return reject(e);
        return resolve();
      });
    });
  }

}


