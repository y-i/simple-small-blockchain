const Address = require('./address').default;

class AddressList {
  constructor(blockchain) {
    this._list = {};
    this._blockchain = blockchain;
  }
  get(name) {
    return this._list[name] = (this._list[name] || new Address(name, this._blockchain));
  }
  get nameList() {
    return Object.keys(this._list);
  }
  toJSON(key) {
    const cloneObj = {};
    for (let key of Object.keys(this)) cloneObj[key] = this[key];
    delete cloneObj._blockchain;
    return cloneObj;
  }
};

exports.default = AddressList;
