class PriorityQueue {
  constructor(opt = {cmp: (l, r) => l > r}) {
    this._cmp = (l, r) => opt.cmp(this._tree[l], this._tree[r]);
    this._tree = [];
  }
  get empty() {
    return this._tree.length === 0;
  }
  peek() {
    if (this._tree.length === 0) throw('Priority Queue is empty');
    return this._tree[0];
  }
  pop() {
    const top = this.peek();
    if (this._tree.length > 1) this._tree[0] = this._tree.pop();
    else this._tree.pop();
    const n = this._tree.length;
    let index = 0;
    while (index < n) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      if (leftChildIndex >= n) break;
      if (rightChildIndex >= n) {
        const target = leftChildIndex
        if (this._cmp(target, index)) {
          [this._tree[index], this._tree[target]] = [this._tree[target], this._tree[index]];
        }
        break;
      }
      const target = this._cmp(leftChildIndex, rightChildIndex) ? leftChildIndex : rightChildIndex;
      if (this._cmp(target, index)) {
        [this._tree[index], this._tree[target]] = [this._tree[target], this._tree[index]];
        index = target;
      } else break;
    }
    return top;
  }
  push(v) {
    this._tree.push(v);
    const n = this._tree.length;
    let index = n - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this._cmp(index, parent)) {
        [this._tree[index], this._tree[parent]] = [this._tree[parent], this._tree[index]];
      }
      index = parent;
    }
  }
};

exports.default = PriorityQueue;
