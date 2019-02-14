const BlockChain = require('./blockchain').default;
const PriorityQueue = require('./priorityQueue').default;
const fs = require('fs');

class FullNode {
  constructor() {
    this.blockchain = new BlockChain();
    this.hashmap = this.blockchain.blocks.reduce((obj, {hash}, index) => {
      obj[hash] = index;
      return obj;
    }, {});
    this.utxoPool = {};
    this.unmergedTransactions = new PriorityQueue({
      cmp: (l, r) => l.calcMargin(this.utxoPool) > r.calcMargin(this.utxoPool),
    });

    for (const block of this.blockchain.blocks) {
      for (const transaction of block.transactions) {
        this._updateUTXOPool(transaction);
      }
    }
  }
  /**
   * @public
   * @param {number} n - \# of transactions
   * @returns {Array.<Transaction>} - At most n transactions in order of high margin
   */
  getUnmergedTransactions(n) {
    const transactions = [];
    for (let i = 0; i < n; ++i) {
      if (this.unmergedTransactions.empty) break;
      transactions.push(this.unmergedTransactions.pop());
    }
    for (let i = 0; i < transactions.length; ++i) {
      this.unmergedTransactions.push(transactions[i]);
    }
    return transactions;
  }
  /**
   * @public
   * @param {Transaction} transaction - The transaction we try to add to blockchain.
   * @returns {boolean} - Whether the transaction is valid and added to blockchain or not.
   */
  addTransaction(transaction) {
    if (transaction.isCoinbaseTransaction) {
      console.error('invalid coinbase transaction was rejected.');
      return false;
    }
    if (transaction.validate(this.utxoPool, this.blockchain.validateLockScript) === false) {
      console.error('invalid transaction was rejected.');
      return false;
    }
    this.unmergedTransactions.push(transaction);
    return true;
  }
  addBlock(block) {
    if (block.validate(this.blockchain, this.hashmap) === false) {
      console.error('invalid block was rejected.');
      return false;
    }
    this._addBlockToBlockChain(block);
    // distribute();
    return true;
  }
  _addBlockToBlockChain(block) {
    this.hashmap[block.hash] = this.blockchain.blocks.length;
    this.blockchain.blocks.push(block);
    for (const transaction of block.transactions) {
      this._updateUTXOPool(transaction);
    }
  }
  /**
   * Delete used output from UTXOpool and add new outputs to UTXOpool
   * @private
   * @param {Transaction} transaction - The transaction that was a part of the block merged into blockchain.
   */
  _updateUTXOPool(transaction) {
    for (const {transactionID, outputIndex} of Object.values(transaction.inputs)) {
      const key = `${transactionID}-${outputIndex}`;
      delete this.utxoPool[key];
    }
    for (const [index, output] of Object.entries(transaction.outputs)) {
      const key = `${transaction.hash}-${index}`;
      this.utxoPool[key] = output;
    }
  }
  destroy() {
    fs.writeFileSync('blockchain.json', JSON.stringify(this.blockchain, null , "\t"));
  }
  /*
  _calcMargin(transaction, ignoreReward = false) {
    if (ignoreReward && transaction.inputs[0].transactionID === '0000000000000000000000000000000000000000000000000000000000000000') continue;
    const margin = transaction.calcMargin(this.utxoPool);
    return margin;
  }
  */
};

exports.default = FullNode;

/*
 * addTransaction -> Validate -> add to transacationPool
 * addBlock -> Validation -> add to blockchain -> distribute -> add/delete UTXO
 */
// utxo [transactionID + outputIndex.toString()] => output への配列
// hashmap blockのhash=>blockchain中でのindex の配列
/*
  * input {id: hash of transaction, index: int, lockscript: hash('aaaa')}
  * output {amount: 1000, unlockscript: 'aaaa'}
  */
// (N + Q) log N, NQ
