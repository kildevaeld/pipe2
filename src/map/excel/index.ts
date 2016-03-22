'use strict';

import * as Path from 'path';
import {Pipe2} from '../../pipe2';
import {Transform} from './transform'

const File = require('vinyl');

export function ExcelMap(options) {
    options = options || {};

    return async function transform(file): Promise<File> {

        let data = file;

        if (file instanceof File) {
            if (file.isNull()) return null;
            if (file.isStream()) {
                data = (await Pipe2.stream(file.contents).toBuffer());
            } else {
                data = file.contents
            }
            //return cb(new Error('json: not a vinyl stream'));

        } else if (Buffer.isBuffer(file)) {
            data = data
        } else if (typeof file === 'string') {
            data = file;
        } else if (file.constructor == Object) {
            throw new Error('data cannot be an object');
        } else if (Array.isArray(file)) {
            throw new Error('data connot be an array');
        }
        

        let result = Transform(data, options);
        //let ext = Path.extname(file.path);

        //file.path = file.path.replace(ext, '.json');

        //file.contents = new Buffer(JSON.stringify(result));

        return result;
    }




};