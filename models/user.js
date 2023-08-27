const mongoose = require("mongoose");
const crypto = require("crypto");

const ROLES = {
  NORMAL_USER: 0,
  SUPER_ADMIN: 1,
  CHATS_ADMIN: 2,
  WOMANS_CONFIRMATIONS_ADMIN: 3,
};

const userSchema = mongoose.Schema(
  {
    phone: {
      type: String,
    },

    name: {
      type: String,
      trim: true,
      required: true,
      max: 32,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },

    hashed_password: {
      type: String,
      required: true,
    },

    salt: String,

    role: {
      type: Number,
      default: ROLES.NORMAL_USER,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    resetPasswordLink: {
      data: String,
      default: "",
    },

    notifications: [
      { type: mongoose.ObjectId, ref: "Notification", required: false },
    ],
  },
  { timestamps: true, collection: "usersinfo" }
);

userSchema
  .virtual("password")
  .set(function (password) {
    this._password = password;

    // generate salt
    this.salt = this.makeSalt();

    //encrypt password
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function () {
    return this._password;
  });

userSchema.methods = {
  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  encryptPassword: function (password) {
    if (!password) return "";

    try {
      return crypto
        .createHmac("sha1", this.salt)
        .update(password)
        .digest("hex");
    } catch (err) {
      return "";
    }
  },
  makeSalt: function () {
    return Math.round(new Date().valueOf() * Math.random()) + "";
  },
};

module.exports = mongoose.model("User", userSchema);
