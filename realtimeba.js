"use strict";

const net = require("net");

const client = new net.Socket();

const HOST = "localhost";
const PORT = 9009;
let { param } = require("./param");
const Binance = require("node-binance-api");

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

  subscribeArray.push(param.symbol.toLowerCase() + "@bookTicker");
  //}
  param.binance.futuresSubscribe(subscribeArray, (data) => {
    if (data.e == "bookTicker") {
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
        "bookTicker, " +
        "symb=""" +
        data.s +
        """, b=" +
        data.b +
        ", bv=" +
        data.B +
        ", a=" +
        data.a +
        ", av=" +
        data.A +
        " " +
        data.E;
      //console.log(resData);
      if (!client.destroyed) {
        client.write(resData + "\n", (err) => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
        });
      }
      //  () => {
      //   const rows = [
      //     `trades,name=test_ilp1 value=12.4 ${Date.now() * 1e6}`,
      //     `trades,name=test_ilp2 value=11.4 ${Date.now() * 1e6}`,
      //   ];

      //   function write(idx) {
      //     if (idx === rows.length) {
      //       client.destroy();
      //       return;
      //     }

      //     client.write(rows[idx] + "\n", (err) => {
      //       if (err) {
      //         console.error(err);
      //         process.exit(1);
      //       }
      //       write(++idx);
      //     });
      //   }

      //   write(0);
      // }
    }
  });
}

start();
