const Block = require('../modules/block').default;
const Miner = require('../modules/miner').default;
const Transaction = require('../modules/transaction').default;
const Wallet = require('../modules/wallet').default;

const readlineSync = require('readline-sync');
const W3CWebSocket = require('websocket').w3cwebsocket;

const PORT = parseInt(process.env.PORT) || 8080;
const socket = new W3CWebSocket(`ws://localhost:${PORT}/connect`);

/**
 * @type {Wallet}
 */
let wallet;
/**
 * @type {Miner}
 */
let miner;

let state = 'wait';

socket.onerror = () => {
  console.log('Connection Error');
};

socket.onopen = () => {
  console.log('WebSocket Client Connected');

  wallet = new Wallet('Miner1');
  miner = new Miner(wallet.name);

  socket.send(JSON.stringify({
    action: 'fetchBlockChain',
  }));
};

socket.onmessage = e => {
  if (typeof e.data === 'string') {
    try {
      const {action, data} = JSON.parse(e.data);
      console.log(action);

      switch(action) {
        case 'fetchBlockChain': {
          miner.blockchain = data;
          // transaction取得
          socket.send(JSON.stringify({
            action: 'fetchUTXO',
            data: {
              number: 5,
            },
          }));
          setInterval(() => {
            socket.send(JSON.stringify({
              action: 'fetchTransaction',
              data: {
                number: 5,
              },
            }));
          }, 5 * 1000);
          break;
        }
        case 'fetchUTXO': {
          miner._utxoPool = data.outputs;
          break;
        }
        case 'addBlock': {
          if (!data.res) {
            console.error('Failed to add transaction.');
          } else {
            console.log('Succeed to add transaction.');
          }
          break;
        }
        case 'fetchTransaction': {
          miner.addTransactions(data.transactions);
          if (state === 'wait' && data.transactions.length > 0) {
            state = 'mining';
            const block = miner.mining(wallet._getLockScript('Miner1'));
            socket.send(JSON.stringify({
              action: 'addBlock',
              data: block,
            }));
            state = 'wait';
          }
          break;
        }
        case 'deliverBlock': {
          miner.addBlock(data);
          break;
        }
        default:
          console.log(`Unknown action: ${action}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
};

socket.onclose = () => {
  console.log('echo-protocol Client Closed');
};
