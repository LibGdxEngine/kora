const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  hour: Number, // Hour of the day (0-23)
  status: { type: String, enum: ["reserved", "free"], default: "free" },
});

const dayAvailabilitySchema = new mongoose.Schema({
  date: Date, // Date of availability
  slots: [slotSchema],
});

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
    availability: [dayAvailabilitySchema],
    size: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stadium", StadiumSchema);
