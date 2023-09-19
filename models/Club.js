const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stadiums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stadium" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  address: {
    type: String,
  },
  cost: {
    type: String,
  },
  photos: {
    type: [String],
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
clubSchema.index({ location: "2dsphere" });
const Club = mongoose.model("Club", clubSchema);

module.exports = Club;
