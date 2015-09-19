const util = require('util');
const stdin = process.stdin;
const Readable = require('stream').Readable;

const es = require('event-stream');

stdin.setRawMode(true);

stdin.resume();

stdin.setEncoding( 'utf8' );

stdin.on('data', function (key) {
  if (key === '\u0003') {
    process.exit();
  }
});

var arrowKeys = {
  '\u001bOD': {move: 'left'},
  '\u001bOA': {move: 'up'},
  '\u001bOC': {move: 'right'},
  '\u001bOB': {move: 'down'}
};

function MovementSource() {
  Readable.call(this, {objectMode: true});
  var self = this;
  this.shouldWrite = true;
  stdin.on('data', function (key) {
    // console.log(JSON.stringify(key));
    if (self.shouldWrite) {
      // TODO Filter
      if (arrowKeys[key]) {
        self.shouldWrite = self.push(arrowKeys[key]);
      }
    }
  });
}

util.inherits(MovementSource, Readable);

MovementSource.prototype._read = function (bytes) {
  this.shouldWrite = true;
};

module.exports = MovementSource;

if (require.main === module) {
  (new MovementSource())
    .pipe(es.stringify())
    .pipe(process.stdout);
}

