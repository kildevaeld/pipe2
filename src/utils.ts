
import {Readable, Stream} from 'stream'


export class GenToStream extends Readable {
  constructor (private generator: IterableIterator<any>) {
    super({objectMode: true});
  }

  _read (size: number) {
    try {
        
        var r = this.generator.next();

        if (false === r.done) {
            this.push(r.value);
        } else {
            this.push(null);
        }
    } catch (e) {
        this.emit('error', e);
    }
  }
}


export function * arrayToGenerator (n){
    for (var i=0; i<n.length; i++){
        yield n[i];
    }
}

export function promiseToStream (promise:Promise<any>): Readable {

  var stream:any = new Stream()
    , i = 0
    , paused = false
    , ended = false;

  const end = function () {
    ended = true;
    stream.readable = false;
    stream.emit('end');
  }


  stream.readable = true
  stream.writable = false
  let array = null;
  stream.resume = function () {
    if(ended) return
    paused = false
    if (Array.isArray(array)) {
      var l = array.length
      while(i < l && !paused && !ended) {
        stream.emit('data', array[i++])
      }
      if(i == l && !ended) end();
    } else {
      if (!paused && !ended) {
        stream.emit('data', array);
        end();
      }
    }
  }

  promise.then(function (res) {
    array = res;
    stream.resume();
  }).catch( e => {
    stream.emit(e);
    end();
  })

  stream.pause = function () {
     paused = true
  }
  stream.destroy = function () {
    ended = true
    stream.emit('close')
  }
  return stream
}