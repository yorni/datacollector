let { param } = require("./param");
const Binance = require("node-binance-api");
const tradeM = require("./models/trade");
const depthM = require("./models/depth");
require("dotenv").config();
//mongoose
const mongoose = require("mongoose");

let dataSource = process.env["DATA_SOURCE"];
mongoose.connect(process.env["DATABASE_URL"], { useNewUrlParser: true });

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("connection to db established"));
//mongoose

function initParameters() {
  var myArgs = process.argv.slice(2);

  if (dataSource) {
    param.collectedData = "trades";
  }
  if (myArgs[0] && myArgs[0] == "depth") {
    param.collectedData = "depth";
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
    reconnect: true,
    verbose: true,
  });
}

function start() {
  initParameters();
  let subscribeArray = [];
  if (param.collectedData == "trades") {
    subscribeArray.push(param.symbol.toLowerCase() + "@trade");
  } else {
    subscribeArray.push(param.symbol.toLowerCase() + "@depth@100ms");
  }
  param.binance.futuresSubscribe(subscribeArray, (data) => {
    if (data.e == "depthUpdate") {
      processDepthData(data);
    } else if (data.e == "trade") {
      processTradesData(data);
    }
  });
}

async function processDepthData(depth) {
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

  depthObject = new depthM({
    ticker: param.fullDepth.symbol,
    time: param.fullDepth.eventTime,
    firstId: param.fullDepth.firstId,
    finalId: param.fullDepth.finalId,
    bids: Object.assign({}, param.fullDepth.bids),
    asks: Object.assign({}, param.fullDepth.asks),
  });
  if (depthObject.ticker) {
    try {
      //console.log("Adding depth!");
      //console.log(depthObject);
      const newdepthObject = await depthObject.save();
    } catch (err) {
      console.log("!!!!!!!!!!!!!!", err.message);
    }
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
  tradeObject = new tradeM({
    time: trade.E,
    creationTime: trade.T,
    ticker: trade.s,
    price: Number(trade.p),
    buyerMaker: trade.m,
    volume: Number(trade.q),
  });

  try {
    //console.log("Adding trade!");
    const newTradeObject = await tradeObject.save();
  } catch (err) {
    console.log("!!!!!!!!!!!!!!", err.message);
  }
}

start();
