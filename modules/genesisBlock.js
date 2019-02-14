const Block = require('./block').default;
const Header = require('./header').default;
const Transaction = require('./transaction').default;

class GenesisBlock extends Block {
  constructor(args = {}) {
    super(args);
  }
  static parse(orgBlock) {
    const block = new GenesisBlock();
    block.header = Header.parse(orgBlock.header);
    block.transactions = orgBlock.transactions.map(transaction => Transaction.parse(transaction));
    return block;
  }
  mining() {
    throw "Can't mine genesis block";
  }
  validateHeader() {
    return true;
  }
  get hash() {
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }
};

exports.default = GenesisBlock;
