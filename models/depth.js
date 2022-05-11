const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const depthSchema = new Schema({
  ticker: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },

  firstId: {
    type: Number,
    required: true,
  },
  finalId: {
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
const depth = mongoose.model("depth", depthSchema);
module.exports = depth;
