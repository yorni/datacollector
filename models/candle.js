const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const candleSchema = new Schema({
  ticker: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },

  o: {
    type: Number,
    required: true,
  },
  h: {
    type: Number,
    required: true,
  },
  l: {
    type: Number,
    required: true,
  },
  c: {
    type: Number,
    required: true,
  },
  lastBid: {
    type: Number,
    required: true,
  },
  lastAsk: {
    type: Number,
    required: true,
  },

  v: {
    type: Number,
    required: true,
  },
  mv: {
    type: Number,
    required: true,
  },
  q: {
    type: Number,
    required: true,
  },
  mq: {
    type: Number,
    required: true,
  },

  bids: {
    type: Schema.Types.Mixed,
    required: true,
  },
  asks: {
    type: Schema.Types.Mixed,
    required: true,
  },
});
const candle = mongoose.model("candle", candleSchema);
module.exports = candle;
