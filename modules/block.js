const Header = require('./header').default;
const Transaction = require('./transaction').default;
const shajs = require('sha.js');

/** Class representing a block which includes some transactions. */
class Block {
  /**
   * Create a block.
   * @param {Object} args - Args set some params of header.
   */
  constructor(args = {}) {
    this.header = new Header({
      difficulty: args.difficulty,
      prevBlockHash: args.prevBlockHash,
    });
    this.transactions = args.transactions || [];
  }
  /**
   * Create a block from an object.
   * @param {Object} orgBlock - an object which represents property of Block class
   * @return {Block}
   */
  static parse(orgBlock) {
    const block = new Block();
    block.header = Header.parse(orgBlock.header);
    block.transactions = orgBlock.transactions.map(transaction => Transaction.parse(transaction));
    return block;
  }
  /**
   * Return a hash of previous block
   * @public
   * @member {string} prevBlockHash
   */
  get prevBlockHash() {
    return this.header.prevBlockHash;
  }
  /**
   * Return block's own hash
   * @public
   * @member {string} hash
   */
  get hash() {
    return this.header.hash;
  }

  addTransaction(transaction) {
    this.transactions.push(transaction);
  }
  // マイナー報酬のトランザクションの追加
  _createRewardTransaction(utxoPool, lockScript) {
    // validate済みを仮定
    const minerReward = 1000;
    const minerMargin = this.transactions.reduce((sum, transaction) => {
      return sum + transaction.calcMargin(utxoPool);
    }, 0);

    const transaction = new Transaction(true);
    transaction.addOutput(minerReward + minerMargin, lockScript);

    return transaction;
  }
  mining(utxoPool, lockScript) {
    this.transactions.push(this._createRewardTransaction(utxoPool, lockScript));
    this.header.calcTransactionHash(this.transactions);
    this.header.calcNonce();
  }

  fetchAddressOutputs(address) {
    const outputs = [];
    for (let transaction of this.transactions) {
      transaction.outputs.forEach((output, index) => {
        if (output.name === address) outputs.push({
          transaction: transaction.hash,
          index,
          amount: output.amount,
        });
      });
    }
    return outputs;
  }
  isTargeted(targetTransaction, targetIndex) {
    for (let transaction of this.transactions) {
      if (transaction.inputs.some(input => input.transactionID === targetTransaction && input.outputIndex === targetIndex)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate objects in block.
   * @param {BlockChain} blockchain
   * @param {function} blockchain.validateLockScript - check if unlockScript corresponds to lockScript
   * @param {Array.<Block>} blockchain.blocks -
   * @param {Object.<string, number>} hashmap - map of block's hash to index of block in array.
   * @return {boolean} - This block is valid or not
   */
  validate({validateLockScript, blocks}, hashmap) {
    if (!this.validateTransactions(validateLockScript, blocks, hashmap)) {
      console.error('Invalid transactions in block.');
      return false;
    }
    if (!this.validateTransactionHash()) {
      console.error('Invalide transaction hash in header.');
      return false;
    }
    if (!this.validateHeader()) {
      console.error('Invalid header hash.');
      return false;
    }
    return true;
  }
  validateTransactions(validateLockScript, blocks, hashmap) {
    const minerReward = 1000;
    const results = this.transactions.map(transaction => {
      if (transaction.isCoinbaseTransaction) {
        // 最後のreduceで計算する為に反転
        return -1 * transaction.outputs.reduce((sum, output) => {
          return sum + output.amount;
        }, 0);
      }

      try {
        const err = new Error('Reference to used outout');
        err.name = 'invalid output ref';
        const inputSum = transaction.inputs.reduce((sum, {transactionID, outputIndex, unlockScript}) => {
          let targetBlock = this;
          while (targetBlock.prevBlockHash !== '0') {
            targetBlock = blocks[hashmap[targetBlock.prevBlockHash]];

            // 以前のブロックで同じoutputを参照していると言うことは既にそのoutputは使用済みである
            const isOutputUsed = targetBlock.transactions.some(targetTransaction => {
              return targetTransaction.inputs.some(targetInput => {
                return targetInput.transactionID === transactionID &&
                  targetInput.outputIndex && outputIndex;
              });
            });
            if (isOutputUsed) throw err;

            // 参照したoutputが存在しなかったりunlockできなかったりしたらエラーを返す
            // 対応したoutputであればsumに足す
            for (const targetTransaction of targetBlock.transactions) {
              // 対象のtransactionじゃないので飛ばす
              if (targetTransaction.hash !== transactionID) continue;

              const targetOutput = targetTransaction.outputs[outputIndex];
              if (targetOutput === undefined) throw err;
              if (!validateLockScript(targetOutput.lockScript, unlockScript)) throw err;

              return sum + targetOutput.amount;
            }
          }
          // chain上に存在しないIDを参照している場合
          throw err;
        }, 0);

        const outputSum = transaction.outputs.reduce((sum, output) => {
          return sum + output.amount;
        }, 0);

        const margin = inputSum - outputSum;
        if (margin < 0) return false;
        return margin;
      } catch (e) {
        if (e.name === 'invalid output ref') return false;
        else throw e;
      }
    });

    return results.every(result => result !== false) && results.reduce((sum, v) => {
      return sum + v;
    }, 0) === -minerReward;
  }
  validateTransactionHash() {
    return this.header.validateTransactionHash(this.transactions);
  }
  validateHeader() {
    return this.header.isSatisfyDifficulty(this.header.hash);
  }
};

exports.default = Block;
