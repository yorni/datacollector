let { param } = require("./param");
const Binance = require("node-binance-api");
const tradeM = require("./models/trade");
const depthM = require("./models/depth");
require("dotenv").config();
//mongoose
const mongoose = require("mongoose");
console.log(process.env["DATABASE_URL"]);
mongoose.connect(process.env["DATABASE_URL"], { useNewUrlParser: true });

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("connection to db established"));
//mongoose

function initParameters() {
  var myArgs = process.argv.slice(2);
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
async function processDepthData(depth) {}
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
    const newTradeObject = await tradeObject.save();
  } catch (err) {
    console.log("!!!!!!!!!!!!!!", err.message);
  }
}

start();
