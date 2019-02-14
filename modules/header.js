const shajs = require('sha.js');

class Header {
  constructor(args = {}) {
    const difficulty = args.difficulty || 4;
    this.prevBlockHash = args.prevBlockHash;
    this.timeStamp = new Date().getTime();
    this.difficultyTaret = '0'.repeat(difficulty) + 'f'.repeat(64 - difficulty);
    this.nonce = null;
    this.transactionHash = null;
  }
  static parse(orgHeader) {
    return Object.assign(new Header(), orgHeader);
  }
  calcTransactionHash(transactions, isUpdate = true) {
    let n = transactions.length;
    const hash = transactions.map(transaction => transaction.hash);
    while (n > 1) {
      for (let i = 0; i < (n-1)/2; ++i) {
        hash[i] = shajs('sha256').update(hash[2*i]).update(hash[2*i+1]).digest('hex');
      }
      n = (n + 1) / 2;
    }
    if (isUpdate) this.transactionHash = hash[0];
    return hash[0];
  }
  calcNonce(isUpdate = true) {
    // targetStringの文字が先頭からdifficultyの分だけ続いてたら合格
    this.nonce = 0;
    while (true) {
      const hash = this.hash;
      if (this.isSatisfyDifficulty(hash)) break;
      ++this.nonce;
    }
  }
  get hash() {
    const hashStr = `${this.prevBlockHash}${this.transactionHash}${this.timeStamp}${this.difficulty}${this.nonce}`;
    return shajs('sha256').update(hashStr).digest('hex');
  }
  isSatisfyDifficulty(hash) {
    return hash < this.difficultyTaret;
  }

  validateTransactionHash(transactions) {
    return this.transactionHash === this.calcTransactionHash(transactions);
  }
};

exports.default = Header;
