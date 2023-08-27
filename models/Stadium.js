const mongoose = require("mongoose");

const StadiumSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      min: 3,
      max: 160,
      required: true,
    },
    photos: {
      type: [String],
    },
    size: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stadium", StadiumSchema);
