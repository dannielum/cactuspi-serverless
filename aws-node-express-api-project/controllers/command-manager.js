module.exports = class CommandManager {
  constructor(publisher) {
    this._publisher = publisher;
  }

  command(cmd) {
    this._publisher.publish(cmd, {
      'command': cmd
    });
  }
};
