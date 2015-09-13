const Readable = require('stream').Readable;
const util = require('util');

const es = require('event-stream');

const tetrominoes = {
  /*
   * xxxx 
   */
  i: [
    [1,1,1,1]
  ],
  /*
   * xxx
   *   x
   */
  j: [
    [1,1,1],
    [0,0,1]
  ],
  /*
   * xxx
   * x
   */
   l: [
    [1,1,1],
    [1,0,0]
   ],
   /*
    * xx
    * xx
    */
   o: [
    [1,1],
    [1,1]
   ],
   /*
    *  xx
    * xx
    */
   s: [
    [0,1,1],
    [1,1,0]
   ],
   /*
    * xxx
    *  x
    */
   t: [
    [1,1,1],
    [0,1,0]
   ],
   /*
    * xx
    *  xx
    */
   z: [
    [1,1,0],
    [0,1,1]
   ]
};

var tetrominoesKeys = Object.keys(tetrominoes);

function tetrominoStream() {
  Readable.call(this, {objectMode: true});
}

util.inherits(tetrominoStream, Readable);

tetrominoStream.prototype._read = function () {
  var result = true;

  while (result) {
    var position = Math.floor(Math.random() * tetrominoesKeys.length);
    var tetromino = {
      tetromino: tetrominoes[tetrominoesKeys[position]],
      rotation: Math.floor(Math.random() * 4)
    };
    result = this.push(tetromino);
  }
};

module.exports = tetrominoStream;

if (require.main === module) {
  (new tetrominoStream()).pipe(es.stringify())
                         .pipe(process.stdout);
}
