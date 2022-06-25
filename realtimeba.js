"use strict";

const net = require("net");

const client = new net.Socket();

const HOST = "localhost";
const PORT = 9009;
let { param } = require("./param");
const Binance = require("node-binance-api");
let prev_Book = {};

require("dotenv").config();

client.connect(PORT, HOST);

client.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

client.on("close", () => {
  console.log("Connection closed" + response);
});

var response = "";
client.on("data", function (chunk) {
  response += chunk;
});

function initParameters() {
  var myArgs = process.argv.slice(2);

  if (process.env["TICKER"]) {
    param.symbol = process.env["TICKER"];
  }

  param.binance = new Binance().options({
    APIKEY: process.env["APIKEY"],
    APISECRET: process.env["APISECRET"],
    verbose: true,
    reconnect: false,
  });
}

function start() {
  initParameters();
  startSubscription();
  setInterval(checkBinanceWebSocketsState, 5000);
}
function checkBinanceWebSocketsState() {
  let endpoints = param.binance.futuresSubscriptions();
  let endpointsCount = 0;
  for (let endpoint in endpoints) {
    endpointsCount++;
  }
  if (!endpointsCount) {
    param.fullDepth = {};
    param.depthSnapshot = undefined;
    param.depthSnapshotSended = false;
    param.updateDepth = [];
    param.depthUpdated = false;
    startSubscription();
  }
}
function startSubscription() {
  let subscribeArray = [];

  subscribeArray.push(param.symbol.toLowerCase() + "@trade");
  subscribeArray.push(param.symbol.toLowerCase() + "@bookTicker");
  //}
  param.binance.futuresSubscribe(subscribeArray, (data) => {
    if (data.e == "trade") {
      // {
      //   e: 'trade',
      //   E: 1656186618377,
      //   T: 1656186618369,
      //   s: 'FTMUSDT',
      //   t: 514511017,
      //   p: '0.295400',
      //   q: '5135',
      //   X: 'MARKET',
      //   m: false
      // }
      //CREATE TABLE 'trades' (
      //   symb SYMBOL capacity 256 CACHE,
      //   p DOUBLE,
      //   q DOUBLE,
      //   m boolean,
      //   ts TIMESTAMP
      // ) timestamp (ts);
      let resData =
        "trades," +
        "symb=" +
        data.s +
        " p=" +
        data.p +
        ",q=" +
        data.q +
        ",m=" +
        data.m +
        " " +
        data.E * 1e6;
      if (!client.destroyed) {
        client.write(resData + "\n", (err) => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
        });
      }
    }
    if (data.e == "bookTicker") {
      if (prev_Book.E) {
        let difAsk = (Number(prev_Book.a) - Number(data.a)) / Number(data.a);
        let difBid = (Number(prev_Book.b) - Number(data.b)) / Number(data.b);
        if (Math.abs(difAsk) > 0.1 || Math.abs(difBid) > 0.1) {
          console.log(prev_Book, data, difAsk, difBid);
        }
      }

      //   {
      //     e: 'bookTicker',
      //     u: 1646689643715,
      //     s: 'GMTUSDT',
      //     b: '0.77080',
      //     B: '15584',
      //     a: '0.77090',
      //     A: '2000',
      //     T: 1655996285492,
      //     E: 1655996285501
      //   }
      //   CREATE TABLE bookTicker(symb SYMBOL, b DOUBLE, bv DOUBLE, a DOUBLE, A DOUBLE, ts TIMESTAMP) timestamp(ts);
      let resData =
        "bookTicker," +
        "symb=" +
        data.s +
        " b=" +
        data.b +
        ",bv=" +
        data.B +
        ",a=" +
        data.a +
        ",av=" +
        data.A +
        " " +
        data.E * 1e6;
      //console.log(resData);
      if (!client.destroyed) {
        client.write(resData + "\n", (err) => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
        });
      }
      prev_Book = Object.assign({}, data);
    }
  });
}

start();
