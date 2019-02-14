const Block = require('./modules/block').default;
const FullNode = require('./modules/fullNode').default;
const Wallet = require('./modules/wallet').default;
const shajs = require('sha.js');

const fullNode = new FullNode();

const aliceWallet = new Wallet('Alice');

console.log(aliceWallet.fetchAmount(fullNode.utxoPool));
const bobLockScript = shajs('sha256').update('Bob').digest('hex');
aliceWallet.send(bobLockScript, 1234, 77, fullNode);

const block = new Block({
  prevBlockHash: '0000000000000000000000000000000000000000000000000000000000000000',
});
block.addTransaction(...fullNode.getUnmergedTransactions(1));
block.mining(fullNode.utxoPool, shajs('sha256').update('Miner1').digest('hex'));
console.log(block);

fullNode.addBlock(block);

console.log(fullNode.blockchain);

fullNode.destroy();
