const fs = require('fs');
const es = require('event-stream');
const Readable = require('stream').Readable;
const Transform = require('stream').Transform;
const PassThrough = require('stream').PassThrough;

const JSONStream = require('JSONStream');

const MoveStream = require('./move');
const TetrominoStream = require('./tetromino');

const COLUMNS = 10;
const ROWS = 12;
const NUMBER_OF_NEXT_PIECES = 5;

function Board(tetrominoes, movements) {
  this.board = [];

  var i, j;

  for (i = 0; i < ROWS; i++) {
    this.board[i] = [1];
    for (j = 1; j < COLUMNS + 1; j++) {
      this.board[i][j] = 0;
    }
    this.board[i][j] = 1;
  }

  this.board[i] = [];
  for (j = 0; j < COLUMNS + 2; j++) {
    this.board[i][j] = 1;
  }

  this.tetrominoes = tetrominoes;
  this.movements = movements;

  this.nextPieces = [];

  this.currentPiece = null;

  this._process();
}

Board.prototype._rotateMatrix = function (matrix) {
  var newMatrix = [];

  var i, j;

  for (i = 0; i < matrix.length; i++) {
    for (j = 0; j < matrix[i].length; j++) {
      newMatrix[j] = newMatrix[j] || [];
      newMatrix[j][matrix.length - i - 1] = matrix[i][j];
    }
  }

  return newMatrix;
};

Board.prototype._newPiece = function (tetromino) {
  var matrix = tetromino.tetromino;
  var rotation = tetromino.rotation;

  return this.rotate({x: 0, y: 5, matrix: matrix}, rotation);
};

Board.prototype.overlaps = function (piece) {
  var i, j;
  var overlaps = false;
  for (i = piece.x; i < piece.x + piece.matrix.length; i++) {
    for (j = piece.y; j < piece.y + piece.matrix[0].length; j++) {
      overlaps = this.board[i][j] & piece.matrix[i - piece.x][j - piece.y];
      if (overlaps) {
        return true;
      }
    }
  }

  return false;
};

Board.prototype.rotate = function (piece, times) {
  times = times || 1;
  var i, result = piece.matrix;

  for (i = 0; i < times; i++) {
    result = this._rotateMatrix(result);
  }

  return {x: piece.x, y: piece.y, matrix: result};
};


Board.prototype._makeMove = function (direction) {
  const self = this;
  var newPiece = JSON.parse(JSON.stringify(this.currentPiece));

  const directions = {
    'left':   {x: 0, y: -1, rotate: 0, sticky: 0},
    'up':     {x: 0, y:  0, rotate: 1, sticky: 0},
    'down':   {x: 1, y:  0, rotate: 0, sticky: 1},
    'right':  {x: 0, y:  1, rotate: 0, sticky: 0}
  };

  if (direction === null) {
    return this.end();
  }

  var translation = directions[direction];

  if (!translation) {
    return;
  }

  newPiece.x += translation.x;
  newPiece.y += translation.y;

  if (translation.rotate) {
    newPiece = this.rotate(newPiece);
  }

  if (translation.sticky) {
    if (self.overlaps(newPiece)) {
      self.set(self.currentPiece);
      self.currentPiece = self._newPiece(self.nextPieces.shift());
      this.tetrominoes.resume();
    }
  }

  if (!self.overlaps(newPiece)) {
    self.currentPiece = newPiece;
  }
  self.change();
};

Board.prototype.end = function () {
  this.tetrominoes.end();
  this.tetrominoes.destroy();
  if (this.movements.destroy) {
    this.movements.destroy();
  }
  process.exit(0);
};

Board.prototype._process = function () {
  var self = this;
  var i;

  this.tetrominoes.on('data', function (piece) {
    if (self.nextPieces.length < NUMBER_OF_NEXT_PIECES) {
      self.nextPieces.push(piece);
    } else {
      self.tetrominoes.pause();
    }

    if (self.currentPiece === null) {
      self.currentPiece = self._newPiece(self.nextPieces.pop());
    }
  });

  this.tetrominoes.on('end', function () {
    self._makeMove(null);
  });

  this.movements.on('data', function (move) {
    self._makeMove(move.move);
  });

  this.movements.on('end', function () {
    self._makeMove(null);
  });

};

Board.prototype.set = function () {
  var i, j;
  var self = this;
  var completedLines = [];
  var linesToCheck = [];
  var lineComplete;
  for (i = this.currentPiece.x; i < this.currentPiece.x + this.currentPiece.matrix.length; i++) {
    for (j = this.currentPiece.y; j < this.currentPiece.y + this.currentPiece.matrix[0].length; j++) {
      this.board[i][j] |= this.currentPiece.matrix[i - this.currentPiece.x][j - this.currentPiece.y];
    }
    linesToCheck.push(i);
  }

  linesToCheck.forEach(function (line) {
    lineComplete = 1;
    for (i = 0; i < self.board[line].length; i++) {
      lineComplete &= self.board[line][i];
    }
    if (lineComplete) {
      completedLines.push(line);
    }
  });

  if (completedLines.length > 0) {
    var lines = this.board.splice(completedLines[0], completedLines.length);
    for (i = 0; i < lines.length; i++) {
      lines[i][0] = 1;
      for (j = 1; j < COLUMNS + 1; j++) {
        lines[i][j] = 0;
      }
      lines[i][j] = 1;
    }
    this.board = lines.concat(this.board);
  }
};

// TODO Refactor to be a writable stream
Board.prototype.change = function () {
  var self = this;
  var i, j;

  var tempBoard = JSON.parse(JSON.stringify(this.board));

  for (i = this.currentPiece.x; i < this.currentPiece.x + this.currentPiece.matrix.length; i++) {
    for (j = this.currentPiece.y; j < this.currentPiece.y + this.currentPiece.matrix[0].length; j++) {
      tempBoard[i][j] |= this.currentPiece.matrix[i - this.currentPiece.x][j - this.currentPiece.y];
    }
  }

  for (i = 0; i < ROWS + 1; i++) {
    for (j = 0; j < COLUMNS + 2; j++) {
      process.stdout.write(tempBoard[i][j] + '');
    }
    process.stdout.write('\n');
  }
  process.stdout.write('----------------\n');
};

module.exports = Board;
