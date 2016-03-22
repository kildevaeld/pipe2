'use strict';
const Pipe2 = require('./').Pipe2;
const Map = require('./mapping').mapping;
let array = [{'Hello':'World'}, {'Hello':'Universe'},[{'Hello':'Universe'}]];

/*Pipe2.array(array)
.map(Pipe2.map.json({split: true }))
.map(() => {
  throw new Error('error')
})
.json()
.toBuffer().then( b => {
    console.log(b.toString());
}).catch( e => {
    console.log(e)
});
*/

Pipe2.src('./livejazz_venue.xlsx')
.map(Pipe2.map.excel({offset: 1}))
.map(Pipe2.map.json({map:Map, split: true}))
///.json({map:Map, split: true})
.toArray().then( a => {
    console.log(a)
}).catch( e => {
    console.log(e)
})
