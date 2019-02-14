const AddressList = require('./addressList').default;
const Block = require('./block').default;
const GenesisBlock = require('./genesisBlock').default;
const shajs = require('sha.js');

class Blockchain {
  constructor() {
    this.blocks = [GenesisBlock.parse({
      header: {
        difficulty: 0,
        prevBlockHash: '0',
      },
      transactions: [{
        inputs: [],
        outputs: [{
          amount: 100000,
          lockScript: '3bc51062973c458d5a6f2d8d64a023246354ad7e064b1e4e009ec8a0699a3043',
        }],
      }],
    })];
  }
  static parse(orgBlockChain) {
    const blockchain = new Blockchain();
    blockchain.blocks = orgBlockChain.blocks.map(block => {
      if (block.header.prevBlockHash === '0') {
        return GenesisBlock.parse(block);
      }
      else return Block.parse(block);
    });
    return blockchain;
  }
  get genesisBlock() {
    return this.blocks[0];
  }
  get lastBlock() {
    return this.blocks.slice(-1)[0];
  }
  validateLockScript(lockScript, unlockScript) {
    return shajs('sha256').update(unlockScript).digest('hex') === lockScript;
  }
  addBlock(block) {
    if (block.validate({Blockchain: this, ignoreReward: true})) this.blocks.push(block);
    else throw "invalid block";
  }
  fetchUnspentOutput(address) {
    const unspentOutputs = [];
    const chainSize = this.blocks.length;
    for (let i = 0; i < chainSize; ++i) {
      const outputs = this.blocks[i].fetchAddressOutputs(address);
      unspentOutputs.push(...(outputs.filter(output => {
        for (let j = i + 1; j < chainSize; ++j) {
          if (this.blocks[j].isTargeted(output.transaction, output.index)) return false;
        }
        return true;
      })));
    }
    return unspentOutputs;
  }
  validateOutputIsUsed(id, index, targetBlock) {
    const len = this.blocks.length;
    for (let i = len - 1; i >= 0; --i) {
      if (targetBlock !== undefined) {
        if (this.blocks[i].hash !== targetBlock) continue;
        targetBlock = this.blocks[i].prevBlockHash;
      }
      for (let transaction of this.blocks[i].transactions) {
        // 対象のトランザクションの場合所持金を返す
        if (transaction.hash === id) return transaction.outputs[index].amount;
        for (let input of transaction.inputs) {
          // 既に使われている場合、もう使えない
          if (input.transactionID === id && input.outputIndex === index) return 0;
        }
      }
    }
    // そのようなトランザクションが無かった場合
    return 0;
  }
};

// exports.default = Object.freeze(new Blockchain());
exports.default = Blockchain;
