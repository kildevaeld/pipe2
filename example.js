'use strict';
const Pipe2 = require('./').Pipe2;

let array = [{'Hello':'World'}, {'Hello':'Universe'},[{'Hello':'Universe'}]];

Pipe2.array(array)
.map(Pipe2.map.json({split: true }))
.json().toBuffer().then( b => {
    console.log(b.toString());
}).catch( e => {
    console.log(e)
});

