const Wallet = require('../modules/wallet').default;

const readlineSync = require('readline-sync');
const W3CWebSocket = require('websocket').w3cwebsocket;

const PORT = parseInt(process.env.PORT) || 8080;
const client = new W3CWebSocket(`ws://localhost:${PORT}/connect`);

let lastState = '';
/**
 * @type {Wallet}
 */
let wallet;

const input = (client) => {
  const actions = [
    'send',
    'amount',
  ];

  const index = readlineSync.keyInSelect(actions, `(${wallet.name}) What to do?`);
  if (index < 0) {
    console.log(wallet);
    return index;
  }

  const action = actions[index];
  switch (action) {
    case 'send': {
      lastState = 'send1';
      client.send(JSON.stringify({action: 'fetchUTXO'}));
      break;
    }
    case 'amount': {
      lastState = 'amount';
      // TODO: サーバ側でフィルタするかも
      const lockScripts = wallet._addresses.map(address => address.hash);
      client.send(JSON.stringify({action: 'fetchUTXO', data: lockScripts}));
      break;
    }
  }
  console.log(wallet);
  return index;
}

client.onerror = () => {
  console.log('Connection Error');
};

client.onopen = () => {
  console.log('WebSocket Client Connected');

  const name = process.env.NAME || readlineSync.question('What is your name ? ');
  wallet = new Wallet(name);

  if (input(client) < 0) client.close();
};

client.onclose = () => {
  console.log('echo-protocol Client Closed');
};

client.onmessage = (e) => {
  if (typeof e.data === 'string') {
    try {
      const {action, data} = JSON.parse(e.data);
      switch (lastState) {
        case 'send1':
          if (action !== 'fetchUTXO') {
            console.log(`Unknown action: ${action}`);
            return;
          }
          const transaction = wallet.send('7'.repeat(64), 77777, 99, data.outputs);
          client.send(JSON.stringify({action: 'addTransaction', data: transaction}));
          lastState = 'send2';
          break;
        case 'send2':
          if (action !== 'addTransaction') {
            console.log(`Unknown action: ${action}`);
            return;
          }
          if (!data.res) {
            console.error('Failed to add transaction.');
          } else {
            console.log('Succeed to add transaction.');
          }
          lastState = 'wait';
          break;
        case 'amount':
          if (action !== 'fetchUTXO') {
            console.log(`Unknown action: ${action}`);
            return;
          }
          // TODO: サーバ側でフィルタするかも
          console.log(`${wallet.name}'s amount is ${wallet.fetchAmount(data.outputs)}`);
          lastState = 'wait';
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }
    } catch (e) {
      console.error(e.data);
    }
  }
  if (lastState === 'wait') if (input(client) < 0) client.close();
};
