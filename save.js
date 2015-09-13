var fs = require('fs');
var PassThrough = require('stream').PassThrough;
var Readable = require('stream').Readable;
var Transform = require('stream').Transform;

var es = require('event-stream');

var Board = require('./board');
var MoveStream = require('./move');
var TetrominoStream = require('./tetromino');

const createGravityStream = require('./gravity');

const UNIT_OF_TIME_MS = 500;

var movesAndGravity = new PassThrough({objectMode: true});
createGravityStream(UNIT_OF_TIME_MS).pipe(movesAndGravity);
(new MoveStream()).pipe(movesAndGravity);

var start = process.hrtime();

var makeTimesRelative = new Transform({
  objectMode: true,
  transform: function (obj, _, cb) {
    var when = process.hrtime();
    when[0] = when[0] - start[0];
    when[1] = when[1] - start[1];

    if (when[1] < 0) {
      when[0] -= 1;
      when[1] += 1000000000;
    }

    this.push({when: when, move: obj});
    cb();
  },
  flush: function (cb) {
    this.push(null);
    cb();
  }
});

// var recordedMoves = fs.createWriteStream('moves.play');
// movesAndGravity.pipe(makeTimesRelative).pipe(es.stringify()).pipe(recordedMoves);

var tetromino = new TetrominoStream();

// var recordedTetrominos = fs.createWriteStream('nextPieces');
// tetromino.pipe(es.stringify()).pipe(recordedTetrominos);

new Board(tetromino, movesAndGravity);

