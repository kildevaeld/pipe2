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
const Path = require('path');
const pipe2_1 = require('../../pipe2');
const transform_1 = require('./transform');
function ExcelMap(options) {
    options = options || {};
    return function transform(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(file instanceof vinyl_1.default)) {
                throw new Error('excel: not a vinyl stream');
            }
            if (file.isNull())
                return file;
            if (file.isStream()) {
                file.contents = yield pipe2_1.Pipe2.stream(file.contents).toBuffer();
            }
            let result = transform_1.Transform(file.contents, options);
            let ext = Path.extname(file.path);
            file.path = file.path.replace(ext, '.json');
            file.contents = new Buffer(JSON.stringify(result));
            return file;
        });
    };
}
exports.ExcelMap = ExcelMap;
;
