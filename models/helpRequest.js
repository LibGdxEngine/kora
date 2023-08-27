const mongoose = require("mongoose");

const HELP_REQUEST_STATUS = {
  PENDING: 0,
  DONE: 1,
  FAILED: 2,
};

const helpRequestSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    reciever: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    status: {
      type: Number,
      default: HELP_REQUEST_STATUS.PENDING,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
