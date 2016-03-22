'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const pipe2_1 = require('../../pipe2');
const transform_1 = require('./transform');
const File = require('vinyl');
function ExcelMap(options) {
    options = options || {};
    return function transform(file) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = file;
            if (file instanceof File) {
                if (file.isNull())
                    return null;
                if (file.isStream()) {
                    data = (yield pipe2_1.Pipe2.stream(file.contents).toBuffer());
                }
                else {
                    data = file.contents;
                }
            }
            else if (Buffer.isBuffer(file)) {
                data = data;
            }
            else if (typeof file === 'string') {
                data = file;
            }
            else if (file.constructor == Object) {
                throw new Error('data cannot be an object');
            }
            else if (Array.isArray(file)) {
                throw new Error('data connot be an array');
            }
            let result = transform_1.Transform(data, options);
            //let ext = Path.extname(file.path);
            //file.path = file.path.replace(ext, '.json');
            //file.contents = new Buffer(JSON.stringify(result));
            return result;
        });
    };
}
exports.ExcelMap = ExcelMap;
;
