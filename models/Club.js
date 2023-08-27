const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stadiums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stadium" }],
  address: {
    type: String,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  mDescription: {
    type: String,
  },

  owner: {
    type: mongoose.ObjectId,
    ref: "User",
  },
});

const Club = mongoose.model("Club", clubSchema);

module.exports = Club;
