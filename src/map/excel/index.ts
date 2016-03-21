'use strict';

import File from 'vinyl';
import * as Path from 'path';
import {Pipe2} from '../../pipe2';
import {Transform} from './transform'

export function ExcelMap (options) {
  options = options || {};
  return async function transform (file): Promise<File> {

    if (!(file instanceof File)) {
      throw new Error('excel: not a vinyl stream');
    }

    if (file.isNull()) return file;
    if (file.isStream()) {
        file.contents = await Pipe2.stream(file.contents).toBuffer();
    }

    let result = Transform(file.contents, options);

    let ext = Path.extname(file.path);

    file.path = file.path.replace(ext, '.json');

    file.contents = new Buffer(JSON.stringify(result));

    return file;
  }

};