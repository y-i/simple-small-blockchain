#!/usr/bin/env node
'use strict';
const Block = require('../modules/block').default;
const FullNode = require('../modules/fullNode').default;
const Transaction = require('../modules/transaction').default;

const http = require('http');
const WebSocketServer = require('websocket').server;

const PORT = parseInt(process.env.PORT) || 8080;

const fullNode = new FullNode();

const clients = {};

const broadcast = (msg, clientID) => {
  for (const client of Object.values(clients)) {
    if (client.clientID === clientID) continue;
    client.sendUTF(msg);
  }
}

const server = http.createServer((req, res) => {
  console.log((new Date()) + ' Received request for ' + req.url);
  res.writeHead(404);
  res.end();
});
server.listen(PORT, function() {
  console.log((new Date()) + ' Server is listening on port ' + PORT);
});

const wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

const originIsAllowed = origin => {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', req => {
  if (!originIsAllowed(req.origin) || req.resource !== '/connect') {
    // Make sure we only accept requests from an allowed origin
    req.reject();
    console.log((new Date()) + ' Connection from origin ' + req.origin + ' rejected.');
    return;
  }

  // var connection = request.accept('echo-protocol', request.origin);
  const connection = req.accept();
  connection.clientID = Math.floor(Math.random() * 1000000);
  clients[connection.clientID] = connection;

  console.log(`There are ${Object.keys(clients).length} clients`);

  console.log((new Date()) + ' Connection accepted.');
  connection.on('message', message => {
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      const {action, data} = JSON.parse(message.utf8Data);
      switch (action) {
        case 'fetchBlockChain':
          connection.sendUTF(JSON.stringify({
            action: 'fetchBlockChain',
            data: fullNode.blockchain
          }));
          break;
        case 'addTransaction': {
          const transaction = Transaction.parse(data);
          const res = fullNode.addTransaction(transaction);
          connection.sendUTF(JSON.stringify({
            action: 'addTransaction',
            data: {
              res,
            },
          }));
          break;
        }
        case 'addBlock': {
          const block = Block.parse(data);
          const res = fullNode.addBlock(block);
          connection.sendUTF(JSON.stringify({
            action: 'addBlock',
            data: {
              res,
            },
          }));
          if (res) {
            broadcast(JSON.stringify({
              action: 'deliverBlock',
              data: block,
            }), connection.clientID);
          }
          break;
        }
        case 'fetchTransaction': {
          const transactions = fullNode.getUnmergedTransactions(data.number);
          connection.sendUTF(JSON.stringify({
            action: 'fetchTransaction',
            data: {
              transactions,
            },
          }));
          break;
        }
        case 'fetchUTXO': {
          // TODO: サーバ側でフィルタするかも
          const outputs = fullNode.utxoPool;
          connection.sendUTF(JSON.stringify({
            action: 'fetchUTXO',
            data: {
              outputs,
            },
          }));
          break;
        }
        case 'deliverBlock':
          // TODO: 受け取るだけで送ったりはしない
          const block = Block.parse(data);
          const res = fullNode.addBlock(block);
          break;
        default:
          connection.sendUTF(`Unknown action: ${action}`);
      }
      console.log(fullNode);
      console.log(action);
    }
  });
  connection.on('close', (reasonCode, description) => {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    for (const key of Object.keys(clients)) {
      if (parseInt(key) !== connection.clientID) continue;
      delete clients[key];
      break;
    }
    console.log(`There are ${Object.keys(clients).length} clients`);
  });
});
