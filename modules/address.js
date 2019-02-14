const Transaction = require('./transaction').default;

class Address {
  constructor(name, blockchain) {
    this.name = name;
    this._blockchain = blockchain;
  }
  send(to, amount, fee = 0) {
    if (amount === 0) throw "Can't send 0";
    let rest = amount;
    const transaction = new Transaction();
    for (let output of this._blockchain.fetchUnspentOutput(this.name)) {
      if (rest <= 0) break;
      transaction.addInput(output.transaction, output.index);
      rest -= output.amount;
    }

    if (rest > 0) throw "Balance is less than amount";
    if (rest < 0) transaction.addOutput(-rest-fee, this.name);
    transaction.addOutput(amount, to);
    return transaction;
  }
  get amount() {
    return this._blockchain.fetchUnspentOutput(this.name).reduce((sum, output) => {
      return sum + output.amount;
    }, 0);
  }
  toJSON(key) {
    const cloneObj = {};
    for (let key of Object.keys(this)) cloneObj[key] = this[key];
    delete cloneObj._blockchain;
    return cloneObj;
  }
}

exports.default = Address;
