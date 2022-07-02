let { param } = require("./param");
const Binance = require("node-binance-api");
const tradeM = require("./models/trade");
const depthM = require("./models/depth");
const candleM = require("./models/candle");
require("dotenv").config();
//mongoose
const mongoose = require("mongoose");

mongoose.connect(process.env["DATABASE_URL"], { useNewUrlParser: true });

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("connection to db established"));
//mongoose

function initParameters() {
  var myArgs = process.argv.slice(2);

  if (process.env["DATA_SOURCE"]) {
    param.collectedData = process.env["DATA_SOURCE"];
  }
  if (myArgs[0] && myArgs[0] == "depth") {
    param.collectedData = "depth";
  }
  if (process.env["MINDEPTH"]) {
    param.minDepthValue = process.env["MINDEPTH"];
  }
  if (process.env["LENGTH"]) {
    param.levelLength = Number(process.env["LENGTH"]);
  }

  if (process.env["TICKER"]) {
    param.symbol = process.env["TICKER"];
  }

  if (myArgs[1]) {
    param.symbol = myArgs[1];
  }
  if (myArgs[2] && myArgs[2] == "log") {
    param.logData = true;
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
  //console.log(endpoints);
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
  //if (param.collectedData == "trades") {
  subscribeArray.push(param.symbol.toLowerCase() + "@aggTrade");
  // } else {
  subscribeArray.push(param.symbol.toLowerCase() + "@depth@100ms");
  //}
  param.binance.futuresSubscribe(subscribeArray, (data) => {
    if (data.e == "depthUpdate") {
      processDepthData(data);
    } else if (data.e == "aggTrade") {
      processTradesData(data);
    } else if (data.e == "bookTicker") {
      console.log(data);
    }
  });
}

function newCandle(depth) {
  param.candle = Object.assign({}, param.newCandle);
  param.candle.time = depth.E;
  param.candle.ticker = depth.s;
}
async function saveCandle(candle) {
  candleObject = new candleM();
  candleObject.time = candle.time;
  candleObject.ticker = candle.ticker;
  candleObject.o = candle.o;
  candleObject.h = candle.h;
  candleObject.l = candle.l;
  candleObject.c = candle.c;
  candleObject.lastAsk = Number(Object.keys(param.fullDepth.asks)[0]);
  candleObject.lastBid = Number(Object.keys(param.fullDepth.bids)[0]);
  candleObject.v = candle.v;
  candleObject.mv = candle.mv;
  candleObject.q = candle.q;
  candleObject.mq = candle.mq;
  candleObject.bids = Object.assign({}, candle.bids);
  candleObject.asks = Object.assign({}, candle.asks);

  removeSmallLevels(candleObject);
  //console.log(candleObject);
  try {
    const newcandleObject = await candleObject.save();
    //console.log(newcandleObject);
  } catch (err) {
    console.log("!!!!!!!!!!!!!!", err.message);
  }
}

function removeSmallLevels(candleObject) {
  askVolumes1 = [];
  bidVolumes1 = [];
  askVolumes05 = [];
  bidVolumes05 = [];
  maxAsk05 = candleObject.lastAsk * 1.005;
  maxBid05 = candleObject.lastBid * 0.995;
  maxAsk1 = candleObject.lastAsk * 1.01;
  maxBid1 = candleObject.lastBid * 0.99;
  bids = {};
  asks = {};
  Object.keys(candleObject.bids).forEach((bid) => {
    if (Number(bid) >= maxBid1) {
      bidVolumes1.push(Number(candleObject.bids[bid]));
    }
    if (Number(bid) >= maxBid05) {
      bidVolumes05.push(Number(candleObject.bids[bid]));
    }

    numBid = Number(bid);
    numBid =
      Math.floor(numBid * Math.pow(10, param.levelLength)) /
      Math.pow(10, param.levelLength);

    if (String(numBid) in bids) {
      bids[String(numBid)] += candleObject.bids[bid];
    } else {
      bids[String(numBid)] = candleObject.bids[bid];
    }
  });

  candleObject.bids = Object.assign(
    {},
    Object.keys(bids)
      .sort(function (a, b) {
        if (+a <= +b) {
          return 1;
        } else {
          return -1;
        }
      })
      .reduce((obj, key) => {
        obj[key] = bids[key];
        return obj;
      }, {})
  );

  Object.keys(candleObject.asks).forEach((ask) => {
    if (Number(ask) <= maxAsk1) {
      askVolumes1.push(Number(candleObject.asks[ask]));
    }
    if (Number(ask) <= maxAsk05) {
      askVolumes05.push(Number(candleObject.asks[ask]));
    }
    numAsk = Number(ask);
    numAsk =
      Math.floor(numAsk * Math.pow(10, param.levelLength)) /
      Math.pow(10, param.levelLength);
    if (String(numAsk) in asks) {
      asks[String(numAsk)] += candleObject.asks[ask];
    } else {
      asks[String(numAsk)] = candleObject.asks[ask];
    }
  });

  candleObject.asks = Object.assign(
    {},
    Object.keys(asks)
      .sort(function (a, b) {
        if (Number(a) <= Number(b)) {
          return -1;
        } else {
          return 1;
        }
      })
      .reduce((obj, key) => {
        obj[key] = asks[key];
        return obj;
      }, {})
  );

  askVolumes1.sort(function (a, b) {
    return a - b;
  });
  bidVolumes1.sort(function (a, b) {
    return a - b;
  });
  askVolumes05.sort(function (a, b) {
    return a - b;
  });
  bidVolumes05.sort(function (a, b) {
    return a - b;
  });

  bidVolumes1 = bidVolumes1.slice(0, -2);
  bidVolumes05 = bidVolumes05.slice(0, -1);
  askVolumes1 = askVolumes1.slice(0, -2);
  askVolumes05 = askVolumes05.slice(0, -1);

  candleObject.bid1 = bidVolumes1.reduce((acc, cur) => acc + cur);
  candleObject.bid05 = bidVolumes05.reduce((acc, cur) => acc + cur);
  candleObject.ask1 = askVolumes1.reduce((acc, cur) => acc + cur);
  candleObject.ask05 = askVolumes05.reduce((acc, cur) => acc + cur);
}

async function processDepthData(depth) {
  if (!param.candle.ticker) {
    newCandle(depth);
  }

  param.candle.numOfDepth++;
  if (
    Math.round((depth.E - 499) / 1000) >
      Math.round((param.candle.time - 499) / 1000) &&
    param.candle.numOfDepth >= 10
  ) {
    param.candle.bids = Object.assign({}, param.fullDepth.bids);
    param.candle.asks = Object.assign({}, param.fullDepth.asks);
    let candleToSave = Object.assign({}, param.candle);
    newCandle(depth);
    saveCandle(candleToSave);
    param.candle.time = depth.E;
  }

  if (!param.depthSnapshotSended) {
    param.depthSnapshotSended = true;
    param.depthSnapshot = await param.binance.futuresDepth(param.symbol, {
      limit: 1000,
    });

    let depthL = {
      lastUpdateId: param.depthSnapshot.lastUpdateId,
      bids: {},
      asks: {},
    };
    param.depthSnapshot.asks.forEach((el) => {
      depthL.asks[el[0]] = +el[1];
    });
    param.depthSnapshot.bids.forEach((el) => {
      depthL.bids[el[0]] = +el[1];
    });
    param.depthSnapshot = Object.assign({}, depthL);
  }

  if (param.depthSnapshot == undefined) {
    param.updateDepth.push(depth);
  } else if (!param.depthUpdated) {
    param.updateDepth.push(depth);
    param.updateDepth.forEach((element) => {
      if (
        element.U <= param.depthSnapshot.lastUpdateId + 1 &&
        element.u >= param.depthSnapshot.lastUpdateId + 1
      ) {
        appyUpdate(element, param.depthSnapshot);
        param.depthUpdated = true;
      }
    });

    if (!param.depthUpdated) {
      param.depthUpdated = true;
      param.fullDepth = Object.assign({}, param.depthSnapshot);
    }
  } else {
    appyUpdate(depth, param.fullDepth);
  }
}

function appyUpdate(updateDepthL, depthToUpdate) {
  param.fullDepth = {
    symbol: updateDepthL.s,
    eventTime: updateDepthL.E,
    firstId: updateDepthL.U,
    finalId: updateDepthL.u,

    bids: {},
    asks: {},
  };

  param.fullDepth.bids = Object.assign({}, depthToUpdate.bids);
  param.fullDepth.asks = Object.assign({}, depthToUpdate.asks);

  updateDepthL.b.forEach((el) => {
    p = el[0];
    q = Number(el[1]);
    if (q != 0) {
      param.fullDepth.bids[p] = q;
    } else {
      delete param.fullDepth.bids[p];
    }
  });

  updateDepthL.a.forEach((el) => {
    p = el[0];
    q = Number(el[1]);
    if (q != 0) {
      param.fullDepth.asks[p] = q;
    } else {
      delete param.fullDepth.asks[p];
    }
  });

  //sort
  param.fullDepth.asks = Object.keys(param.fullDepth.asks)
    .sort(function (a, b) {
      if (+a <= +b) {
        return -1;
      } else {
        return 1;
      }
    })
    .reduce((obj, key) => {
      obj[key] = param.fullDepth.asks[key];
      return obj;
    }, {});
  param.fullDepth.bids = Object.keys(param.fullDepth.bids)
    .sort(function (a, b) {
      if (+a <= +b) {
        return 1;
      } else {
        return -1;
      }
    })
    .reduce((obj, key) => {
      obj[key] = param.fullDepth.bids[key];
      return obj;
    }, {});
}

async function processTradesData(trade) {
  /*
  {
    e: 'aggTrade',
    E: 1653722773087,
    a: 259642818,
    s: 'SOLUSDT',
    p: '41.8200',
    q: '89',
    f: 448810400,
    l: 448810405,
    T: 1653722772930,
    m: true
  }
  */
  if (!param.candle.ticker) {
    console.log("no candle");
    return;
  }
  let { m: maker, E: time, s: ticker, p: price, q: volume } = trade;
  if (param.candle.o == 0) {
    param.candle.o = Number(price);
    param.candle.h = Number(price);
    param.candle.l = Number(price);
  }
  param.candle.c = Number(price);
  param.candle.v += Number(volume);
  param.candle.q++;
  if (maker) {
    param.candle.mv += Number(volume);
    param.candle.mq++;
  }

  if (param.candle.h < Number(price)) {
    param.candle.h = Number(price);
  }

  if (param.candle.l > Number(price)) {
    param.candle.l = Number(price);
  }
}

start();
