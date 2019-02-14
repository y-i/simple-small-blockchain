const shajs = require('sha.js');
const Transaction = require('./transaction').default;
const Input = require('./input').default;
const Output = require('./output').default;

/** Class representing a wallet which manages addresses. */
class Wallet {
  /**
   * Create a wallet.
   * @param {string} seed - The seed used to create new address.
   */
  constructor(seed = 'seed') {
    this._addresses = [];
    this._seed = seed;

    this._addresses.push({
      id: seed,
      hash: this._getLockScript(seed),
    });
  }
  /**
   * @public
   * @member {string} name
   */
  get name() {
    return this._seed;
  }
  get address() {
    const prevAddr = this._addresses.slice(-1)[0].id;
    const newAddr = shajs('sha256').update(this._seed).update(prevAddr).digest('hex');
    this._addresses.push({id: newAddr, hash: this._getLockScript(newAddr)});
    return newAddr;
  }
  /**
   * Calculate a lockScript that correspond to address (address = unlockScript)
   * @param {string} addr - The address, one of my address in this wallet.
   * @return {string} A lockScript.
   */
  _getLockScript(addr) {
    return shajs('sha256').update(addr).digest('hex');
  }
  _includedBinarySearch(ary, v) {
    let ng = -1;
    let ok = ary.length;
    while (ok - ng > 1) {
      const mid = Math.floor((ok + ng) / 2);
      if (ary[mid].hash === v) return ary[mid].id;
      if (ary[mid].hash > v) ng = mid;
      else ok = mid;
    }
    return ary[ok] === v ? ary[ok].id : false;
  }
  send(lockScript, amount, fee = 0, utxoPool) {
    // 自分のUTXOから足りるように選択してlockScriptに送るトランザクションを作る
    let sum = 0;
    const inputs = [];
    const myLockScripts = this._addresses.sort((l, r) => {
      if (l.hash < r.hash) return -1;
      if (l.hash > r.hash) return 1;
      return 0;
    });
    for (const [key, utxo] of Object.entries(utxoPool)) {
      const correspondedID = this._includedBinarySearch(myLockScripts, utxo.lockScript);
      if (correspondedID === false) continue;
      sum += utxo.amount;
      const transactionID = key.substr(0, 64);
      const outputIndex = key.substr(64+1);
      inputs.push(new Input(transactionID, outputIndex, correspondedID));
      if (sum >= amount + fee);
    }
    if (sum < amount + fee) throw `${this.name}'s amount is too small. (${sum})`;

    const returnAddr = this.address;
    const myLockScript = this._getLockScript(returnAddr);
    const outputToSend = new Output(amount, lockScript);
    const outputToBalance = new Output(sum - amount - fee, myLockScript);
    const outputs = [outputToSend, outputToBalance];

    const transaction = new Transaction();
    transaction.addInputs(inputs);
    transaction.addOutputs(outputs);

    return transaction;
    //fullNode.addTransaction(transaction);
  }
  fetchAmount(utxoPool) {
    // lockScriptsをソートしておけば二分探索可能なので O((N + Q) log N),
    // 全探索する場合 O(NQ)
    // キューの方がアドレス数より遙かに大きいと仮定
    let sum = 0;
    const myLockScripts = this._addresses.sort((l, r) => {
      if (l.hash < r.hash) return -1;
      if (l.hash > r.hash) return 1;
      return 0;
    });
    for (const utxo of Object.values(utxoPool)) {
      if (this._includedBinarySearch(myLockScripts, utxo.lockScript) === false) continue;
      sum += utxo.amount;
    }

    return sum;
  }
};

exports.default = Wallet;

wallet = new Wallet();
