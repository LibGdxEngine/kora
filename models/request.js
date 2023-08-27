const mongoose = require("mongoose");

const REQUEST_STATUS = {
  PENDING: 0,
  READED: 1,
  ACCEPTED: 2,
  REJECTED: 3,
  TIMEOVER: 4,
  FINISHED: 5,
  FAILED: 6,
};

const requestSchema = mongoose.Schema(
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
      default: REQUEST_STATUS.PENDING,
    },
    token: {
      type: String,
    },
    privateRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivateRoom",
    },
    failerReason: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
