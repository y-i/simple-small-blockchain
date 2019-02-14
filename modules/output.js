class Output {
  constructor(amount = {}, lockScript) {
    if (lockScript === undefined) {
      const args = amount;
      this.amount = args.amount;
      this.lockScript = args.lockScript;
      return;
    }
    this.amount = amount;
    this.lockScript = lockScript;
  };
  static parse(orgOutput) {
    return Object.assign(new Output(), orgOutput);
  }
};

exports.default = Output;
