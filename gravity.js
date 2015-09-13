const Readable = require('stream').Readable;

module.exports = function (unitOfTime) {
  return new Readable({
    objectMode: true,
    read: function () {
      var self = this;
      this.canWrite = true;
      if (this.timer) {
        return;
      }
      this.timer = setInterval(function () {
        if (self.canWrite) {
          self.canWrite = self.push({move: 'down'});
        }
      }, unitOfTime);
    }
  });
};
