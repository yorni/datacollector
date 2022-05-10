/*
{
  e: 'trade',
  E: 1652160398919,
  T: 1652160398910,
  s: 'SOLUSDT',
  t: 424241398,
  p: '68.9900',
  q: '1',
  X: 'MARKET',
  m: false
}
*/
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const tradeSchema = new Schema({
  ticker: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  creationTime: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  buyerMaker: {
    type: Boolean,
    required: true,
  },
  volume: {
    type: Number,
    required: true,
  },
});
const trade = mongoose.model("trade", tradeSchema);
module.exports = trade;
