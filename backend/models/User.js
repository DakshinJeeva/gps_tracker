const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String },
  picture: { type: String },

  fabricIdentity: {
    mspId: { type: String, default: null },
    type: { type: String, default: null },
    credentials: {
      certificate: { type: String, default: null },
      privateKey: { type: String, default: null }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
