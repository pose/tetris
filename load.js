var fs = require('fs');

var JSONStream = require('JSONStream');

var Readable = require('stream').Readable;
var Transform = require('stream').Transform;

var Board = require('./board');

var piecesFromFile = fs.createReadStream('./nextPieces')
  .pipe(new Readable({objectMode: true}).wrap(JSONStream.parse(true)));

var movesFromFile = fs.createReadStream('moves.play')
  .pipe(new Readable({objectMode: true}).wrap(JSONStream.parse(true)));

var movesWithTime = movesFromFile.pipe(new Transform({
  objectMode: true,
  transform: function (move, _, cb) {
    var self = this;
    move.when[1] /= 1000000;
    move.when[1] = Math.floor(move.when[1]);
    this.next = (move.when[0] * 1000 + move.when[1]);
    setTimeout(function () {
      self.push(move.move);
    }, self.next);
    cb();
  },
  flush: function (cb) {
    var self = this;
    setTimeout(function () {
      self.push(null);
      cb();
    }, self.next + 1);
  }
}));

new Board(piecesFromFile, movesWithTime);
