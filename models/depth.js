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
});
const depth = mongoose.model("depth", depthSchema);
module.exports = depth;
