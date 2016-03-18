'use strict';
const Pipe2 = require('./').Pipe2;

let array = [{'Hello':'World'}, {'Hello':'Universe'}];

Pipe2.array(array)
.json().toBuffer().then( b => {
    console.log(b.toString());
});

