require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email);
}

// Google token verification
async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

// User login/registration
app.post('/api/user-login', async (req, res) => {
  const { email, name, picture, googleId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, name, picture, googleId, status: 'pending', requestedAt: new Date() });
    await user.save();
  }
  // Check trial expiry
  if (user.status === 'trial' && user.trialStart) {
    const now = new Date();
    const expiry = new Date(user.trialStart);
    expiry.setDate(expiry.getDate() + (user.trialDays || 3));
    if (now > expiry) {
      user.status = 'expired';
      await user.save();
    }
  }
  res.json({ status: user.status, trialDays: user.trialDays, trialStart: user.trialStart, activationDate: user.activationDate });
});

// User requests trial
app.post('/api/request-trial', async (req, res) => {
  const { email } = req.body;
  let user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.status === 'trial' || user.status === 'activated') {
    return res.json({ success: false, message: 'Already activated or in trial.' });
  }
  user.status = 'pending';
  user.requestedAt = new Date();
  await user.save();
  res.json({ success: true });
});

// Get user status
app.get('/api/user-status', async (req, res) => {
  const { email } = req.query;
  let user = await User.findOne({ email });
  if (!user) return res.status(404).json({ status: 'not_found' });
  // Check trial expiry
  if (user.status === 'trial' && user.trialStart) {
    const now = new Date();
    const expiry = new Date(user.trialStart);
    expiry.setDate(expiry.getDate() + (user.trialDays || 3));
    if (now > expiry) {
      user.status = 'expired';
      await user.save();
    }
  }
  res.json({ status: user.status, trialDays: user.trialDays, trialStart: user.trialStart, activationDate: user.activationDate });
});

// --- ADMIN ENDPOINTS ---

// List all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  const { adminEmail } = req.query;
  console.log('ADMIN CHECK:', adminEmail, 'IN', ADMIN_EMAILS);
  if (!isAdmin(adminEmail)) return res.status(403).json({ error: 'Not admin' });
  const users = await User.find();
  res.json({ users });
});

// Approve trial (admin)
app.post('/api/admin/approve-trial', async (req, res) => {
  const { email, days, adminEmail } = req.body;
  if (!isAdmin(adminEmail)) return res.status(403).json({ error: 'Not admin' });
  let user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = 'trial';
  user.trialStart = new Date();
  user.trialDays = days || 3;
  await user.save();
  res.json({ success: true });
});

// Approve permanent activation (admin)
app.post('/api/admin/activate', async (req, res) => {
  const { email, adminEmail } = req.body;
  if (!isAdmin(adminEmail)) return res.status(403).json({ error: 'Not admin' });
  let user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = 'activated';
  user.activationDate = new Date();
  user.trialStart = null;
  await user.save();
  res.json({ success: true });
});

const PORT = process.env.PORT || 4100;
app.listen(PORT, '0.0.0.0', () => console.log(`Beesoft backend running on port ${PORT}`));
