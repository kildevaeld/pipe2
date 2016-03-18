'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vinyl_1 = require('vinyl');
const pipe2_1 = require('../pipe2');
const dottie = require('dottie');
var _check = function (obj, picks) {
    var out = {};
    picks.forEach(function (k) {
        if (obj.hasOwnProperty(k)) {
            out[k] = obj[k];
        }
    });
    return Object.keys(out).length !== 0;
};
function JsonMapper(options) {
    options = options || {};
    let split = options.split || false;
    return function transform(file) {
        return __awaiter(this, void 0, void 0, function* () {
            let str, json;
            if (file instanceof vinyl_1.default) {
                if (file.isNull())
                    return null;
                if (file.isStream()) {
                    str = (yield pipe2_1.Pipe2.stream(file.contents).toBuffer()).toString();
                }
                else {
                    str = file.contents.toString();
                }
            }
            else if (Buffer.isBuffer(file)) {
                str = file.content.toString();
            }
            else if (typeof file === 'string') {
                str = file;
            }
            else if (file.constructor == Object) {
                json = file;
            }
            else if (Array.isArray(file)) {
                json = file;
            }
            if (!json) {
                json = JSON.parse(str);
            }
            if (!options.map) {
                if (Array.isArray(json) && split) {
                    for (var i = 0; i < json.length; i++) {
                        this.push(json[i]);
                    }
                    return null;
                }
                if (file instanceof vinyl_1.default) {
                    file.contents = new Buffer(JSON.stringify(json));
                    json = file;
                }
                return json;
            }
            let promise;
            if (Array.isArray(json)) {
                if (split) {
                    for (var i = 0; i < json.length; i++) {
                        let d = yield mapObject(json[i], options);
                        this.push(d);
                    }
                    return null;
                }
                else {
                    promise = json.map(function (o) {
                        return mapObject(o, options);
                    });
                }
            }
            else {
                promise = mapObject(json, options);
            }
            let results = yield promise;
            if (file instanceof vinyl_1.default) {
                file.contents = new Buffer(JSON.stringify(results));
                results = file;
            }
            return results;
        });
    };
}
exports.JsonMapper = JsonMapper;
;
function mapObject(json, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var strict = options.strict || false;
        if (options.map == null)
            return json;
        let k, v, mapped, index;
        let mapping, mappings = options.map, output = {};
        let attrs = Object.keys(json);
        for (k in mappings) {
            mapping = mappings[k];
            if (!isNaN(k - 0) && k != null) {
                k = attrs[k];
            }
            if (k === undefined)
                continue;
            v = dottie.get(json, k);
            mapped = yield mapProperty(k, v, mapping, json, output);
            if (mapping.append) {
                let oval = dottie.get(output, mapped.key);
                if (oval && Array.isArray(oval)) {
                    oval.push(mapped.value);
                }
                else {
                    oval = [mapped.value];
                }
                mapped.value = oval;
            }
            dottie.set(output, mapped.key, mapped.value);
        }
        return output;
    });
}
function mapProperty(key, value, options, json, output) {
    return __awaiter(this, void 0, void 0, function* () {
        let ret = { key: key, value: value };
        if (typeof options === 'string') {
            ret.key = options;
        }
        else {
            // Nested object
            let to = options.to || key;
            if (typeof to === 'function') {
                to = yield to(key, value, json, output);
            }
            let val = options.value || value;
            if (typeof val === 'function') {
                value = yield val(key, value, json, output);
            }
            ret.key = to;
            ret.value = value;
        }
        return ret;
    });
}
