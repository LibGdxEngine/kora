const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  stadium: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stadium",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hours: [{ type: Number, min: 0, max: 23, required: true }],
  date: { type: Date, required: true },
});

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
