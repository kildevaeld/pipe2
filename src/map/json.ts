'use strict';
import {Pipe2} from '../pipe2';

const dottie = require('dottie')
const File = require('vinyl');

var _check = function (obj:any, picks:string[]): boolean {
  var out = {};
  picks.forEach(function (k) {
    if (obj.hasOwnProperty(k)) {
      out[k] = obj[k];
    }
  });
  return Object.keys(out).length !== 0;
};

export function JsonMapper<T>(options) {
  options = options||{};
  let split = options.split||false;
  return async function transform (file:any): Promise<T> {
    let str, json;
   
    if (file instanceof File) {
      if (file.isNull()) return null;
      if (file.isStream()) {
          str = (await Pipe2.stream(file.contents).toBuffer()).toString();
      } else {
          str = file.contents.toString();
      }
      //return cb(new Error('json: not a vinyl stream'));
      
    } else if (Buffer.isBuffer(file)) {
      str = file.content.toString();
    } else if (typeof file === 'string') {
      str = file;
    } else if (file.constructor == Object) {
      json = file;
    } else if (Array.isArray(file)) {
      json = file;
    }

    if (!json) {
      json = JSON.parse(str);
    }
     
    if (!options.map) {
        
      if (Array.isArray(json) && split) {
        for (var i=0;i<json.length;i++) {
          this.push(json[i]);
        }
        return null;
      }

      if (file instanceof File) {
        file.contents = new Buffer(JSON.stringify(json));
        json = file;
      }

      return json;
    }


    let promise: Promise<any>;
    if (Array.isArray(json)) {

      if (split) {
        for (var i=0;i<json.length;i++) {
            let d = await mapObject(json[i], options);
            this.push(d);
        }
        return null;
      } else {
        promise = json.map(function (o) {
          return mapObject(o, options);
        });
      }

    } else {
      promise = mapObject(json, options);
    }
    
    let results = await promise;
    
    if (file instanceof File) {
        file.contents = new Buffer(JSON.stringify(results));
        results = file;
    }
    
    return results;
  };
};


async function mapObject (json, options): Promise<any> {
  var strict = options.strict || false;
  if (options.map == null) return json;

  let k, v, mapped, index;
  let mapping, mappings = options.map, output = {};

  let attrs = Object.keys(json);

  for (k in mappings) {
      mapping = mappings[k];

      if (! isNaN (k-0) && k != null) {
        k = attrs[k];
      }

      if (k === undefined) continue;
      v = dottie.get(json, k);


      mapped = await mapProperty(k, v, mapping, json, output);

      if (mapping.append) {
        let oval = dottie.get(output, mapped.key);
        if (oval && Array.isArray(oval)) {
          oval.push(mapped.value);
        } else {
          oval = [mapped.value];
        }
        mapped.value = oval;

      }

      dottie.set(output, mapped.key, mapped.value);
  }
  return output;

}

async function mapProperty (key, value, options, json, output): Promise<any> {
  let ret = {key:key, value:value};

  if (typeof options === 'string') {
    ret.key = options;
  } else {
    // Nested object
    let to = options.to || key;
    if (typeof to === 'function') {
      to = await to(key, value, json, output);
    }
    let val = options.value || value;
    if (typeof val === 'function') {
      value = await val(key, value, json, output);
    }
    ret.key = to;
    ret.value = value;
  }

  return ret;
}