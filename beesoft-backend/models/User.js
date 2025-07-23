const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  picture: String,
  googleId: String,
  status: { type: String, enum: ['pending', 'trial', 'activated', 'expired'], default: 'pending' },
  trialStart: Date,
  trialDays: { type: Number, default: 3 },
  activationDate: Date,
  activationMethod: String,
  requestedAt: Date
});

module.exports = mongoose.model('User', userSchema);
