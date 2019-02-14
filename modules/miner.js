const Block = require('./block').default;
const BlockChain = require('./blockchain').default;
const Transaction = require('./transaction').default;

class Miner {
  constructor(lockScript) {
    this._lockScript = lockScript;
    this._transactions = [];
    this._blockchain = null;
    this._utxoPool = {};
  }
  set blockchain(obj) {
    const blockchain = BlockChain.parse(obj);
    if (!blockchain instanceof BlockChain) {
      console.error('Failed to parse blockchain');
      return;
    }
    this._blockchain = blockchain;
  }
  addBlock(obj) {
    this._blockchain.push(Block.parse(obj));
  }
  addTransactions(objs) {
    for (const obj of objs) {
      const transaction = Transaction.parse(obj);
      this._transactions.push(transaction);
    }
  }
  mining(lockScript) {
    const block = new Block({
      prevBlockHash: this._blockchain.lastBlock.hash,
    });
    for (let i = 0; i < 5; ++i) {
      if (this._transactions.length <= i) break;
      /*
      block.addTransaction(this._transactions[0]);
      delete this._transactions[0];
      */
      block.addTransaction(this._transactions[i]);
    }
    block.mining(this._utxoPool, lockScript);
    return block;
  }
}

exports.default = Miner;
