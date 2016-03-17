"use strict";
const stream_1 = require('stream');
class GenToStream extends stream_1.Readable {
    constructor(generator) {
        super({ objectMode: true });
        this.generator = generator;
    }
    _read(size) {
        try {
            var r = this.generator.next();
            if (false === r.done) {
                this.push(r.value);
            }
            else {
                this.push(null);
            }
        }
        catch (e) {
            this.emit('error', e);
        }
    }
}
exports.GenToStream = GenToStream;
function* arrayToGenerator(n) {
    for (var i = 0; i < n.length; i++) {
        yield n[i];
    }
}
exports.arrayToGenerator = arrayToGenerator;
function promiseToStream(promise) {
    var stream = new stream_1.Stream(), i = 0, paused = false, ended = false;
    const end = function () {
        ended = true;
        stream.readable = false;
        stream.emit('end');
    };
    stream.readable = true;
    stream.writable = false;
    let array = null;
    stream.resume = function () {
        if (ended)
            return;
        paused = false;
        if (Array.isArray(array)) {
            var l = array.length;
            while (i < l && !paused && !ended) {
                stream.emit('data', array[i++]);
            }
            if (i == l && !ended)
                end();
        }
        else {
            if (!paused && !ended) {
                stream.emit('data', array);
                end();
            }
        }
    };
    promise.then(function (res) {
        array = res;
        stream.resume();
    }).catch(e => {
        stream.emit(e);
        end();
    });
    stream.pause = function () {
        paused = true;
    };
    stream.destroy = function () {
        ended = true;
        stream.emit('close');
    };
    return stream;
}
exports.promiseToStream = promiseToStream;
