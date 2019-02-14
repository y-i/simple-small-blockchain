class Input {
  constructor(transactionID = {}, outputIndex, unlockScript) {
    if (outputIndex === undefined) {
      const args = transactionID;
      this.transactionID = args.transactionID;
      this.outputIndex = args.outputIndex;
      this.unlockScript = args.unlockScript;
      return;
    }
    this.transactionID = transactionID;
    this.outputIndex = outputIndex;
    this.unlockScript = unlockScript;
  };
  static parse(orgInput) {
    return Object.assign(new Input(), orgInput);
  }
};

exports.default = Input;
