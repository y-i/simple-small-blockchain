const Input = require('./input').default;
const Output = require('./output').default;
const shajs = require('sha.js');

class Transaction {
  constructor(isCoinbase = false) {
    if (!isCoinbase) {
      this.inputs = [];
    } else {
      this.inputs = [new Input('0000000000000000000000000000000000000000000000000000000000000000', 0, '')];
    }
    this.outputs = [];
    this.hash = null;
    this.updateHash();
  }
  static parse(orgTransaction) {
    const transaction = new Transaction();
    transaction.inputs = orgTransaction.inputs.map(input => Input.parse(input));
    transaction.outputs = orgTransaction.outputs.map(output => Output.parse(output));
    transaction.hash = orgTransaction.hash;
    if (transaction.hash === undefined) transaction.updateHash();
    return transaction;
  }
  get isCoinbaseTransaction() {
    return this.inputs.length === 1 && this.inputs[0].transactionID === '0000000000000000000000000000000000000000000000000000000000000000';
  }
  addInput(transactionID, outputIndex, unlockScript) {
    if (outputIndex === undefined) {
      const input = transactionID;
      this.inputs.push(input);
    } else {
      this.inputs.push(Input.parse({
        transactionID: transactionID,
        outputIndex: outputIndex,
        unlockScript: unlockScript,
      }));
    }
    this.updateHash();
  }
  addInputs(inputs) {
    this.inputs.push(...inputs);
    this.updateHash();
  }
  addOutput(amount, lockScript) {
    this.outputs.push(Output.parse({
      amount: amount,
      lockScript: lockScript,
    }));
    this.updateHash();
  }
  addOutputs(outputs) {
    this.outputs.push(...outputs);
    this.updateHash();
  }
  updateHash() {
    this.hash = this.calcHash();
  }
  calcHash() {
    const hash = shajs('sha256').update(JSON.stringify(this.inputs) + JSON.stringify(this.outputs)).digest('hex');
    return shajs('sha256').update(hash).digest('hex');
  }

  validate(utxoPool, validateLockScript) {
    if (!this.validateInputs(utxoPool, validateLockScript)) {
      console.error('invalid input in transaction.');
      return false;
    }
    if (!this.validateHash()) {
      console.error('invalid hash in transaction.');
      return false;
    }
    if (this.calcMargin(utxoPool) < 0) {
      console.error('negative margin.');
      return false;
    }
    return true;
  }
  validateInputs(utxoPool, validateLockScript) {
    return this.inputs.every(({transactionID, outputIndex, unlockScript}) => {
      const key = `${transactionID}-${outputIndex}`;
      if (key in utxoPool === false) return false;
      if (!validateLockScript(utxoPool[key].lockScript, unlockScript)) return false;
      return true;
    });
  }
  validateHash() {
    return this.hash === this.calcHash();
  }
  calcMargin(utxoPool) {
    const outputSum = this.outputs.reduce((sum, {amount}) => {
      return sum + amount;
    }, 0);
    if (this.isCoinbaseTransaction) return -outputSum;
    const inputSum = this.inputs.reduce((sum, {transactionID, outputIndex}) => {
      const key = `${transactionID}-${outputIndex}`;
      return sum + utxoPool[key].amount;
    }, 0);
    return inputSum - outputSum;
  }
};

exports.default = Transaction;
