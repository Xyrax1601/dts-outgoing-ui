import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dts_super_secret_jwt_key_2026';

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Register User
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!isMongoConnected()) {
      // Fallback local session mode when MongoDB URI is not configured yet
      const token = jwt.sign({ id: 'local-id', username }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Local session created (Connect MongoDB Cloud Atlas in .env for cloud storage)',
        token,
        user: { id: 'local-id', username, role: 'admin' }
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      username: username.toLowerCase().trim(),
      passwordHash
    });

    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully in MongoDB Cloud',
      token,
      user: { id: user._id, username: user.username, role: user.role, offices: user.offices || [] }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const normUsername = username.toLowerCase().trim();

    if (!isMongoConnected()) {
      // Fallback local mode
      const token = jwt.sign({ id: 'local-id', username: normUsername }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Login successful (Local session mode)',
        token,
        user: { id: 'local-id', username: normUsername, role: 'admin', offices: [] }
      });
    }

    const user = await User.findOne({ username: normUsername });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role, offices: user.offices || [] }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get Current User Profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isMongoConnected()) {
      return res.json({ user: { id: decoded.id, username: decoded.username, role: 'admin', offices: [] } });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.json({ user: { id: decoded.id, username: decoded.username, role: 'admin', offices: [] } });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Update User Office List
router.put('/offices', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { offices } = req.body;

    if (!Array.isArray(offices)) {
      return res.status(400).json({ error: 'Offices must be an array of strings' });
    }

    const cleanOffices = offices.map(o => String(o).trim()).filter(Boolean);

    if (isMongoConnected()) {
      const user = await User.findByIdAndUpdate(
        decoded.id,
        { offices: cleanOffices },
        { new: true }
      ).select('-passwordHash');
      return res.json({ message: 'User offices updated successfully', offices: user ? user.offices : cleanOffices });
    }

    res.json({ message: 'User offices updated locally', offices: cleanOffices });
  } catch (err) {
    console.error('Update offices error:', err);
    res.status(500).json({ error: 'Failed to update user offices' });
  }
});

// Verify Current Password
router.post('/verify-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    if (!isMongoConnected()) {
      // Local fallback mode: verify admin demo password or accept
      if (decoded.username === 'admin' && password !== 'admin123') {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
      return res.json({ valid: true, message: 'Password verified' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    res.json({ valid: true, message: 'Password verified' });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(401).json({ error: 'Invalid session or password verification failed' });
  }
});

// Update User Credentials (Username and/or Password)
router.put('/credentials', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to update credentials' });
    }

    if (!newUsername && !newPassword) {
      return res.status(400).json({ error: 'Please provide a new username or new password to update' });
    }

    const oldUsername = (decoded.username || '').toLowerCase().trim();
    const cleanNewUsername = newUsername ? newUsername.toLowerCase().trim() : null;

    if (cleanNewUsername && cleanNewUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    if (!isMongoConnected()) {
      // Fallback local mode
      if (oldUsername === 'admin' && currentPassword !== 'admin123') {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
      const finalUsername = cleanNewUsername || oldUsername;
      const newToken = jwt.sign({ id: decoded.id, username: finalUsername }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Credentials updated successfully (Local mode)',
        token: newToken,
        user: { id: decoded.id, username: finalUsername, role: 'admin', offices: [] }
      });
    }

    // Check user in MongoDB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // If username is changing, check uniqueness
    if (cleanNewUsername && cleanNewUsername !== oldUsername) {
      const existingUser = await User.findOne({ username: cleanNewUsername });
      if (existingUser && String(existingUser._id) !== String(user._id)) {
        return res.status(400).json({ error: 'Username already taken by another account' });
      }
      user.username = cleanNewUsername;
    }

    // If password is changing, hash new password
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    // If username changed, migrate user's dedicated collections in MongoDB
    if (cleanNewUsername && cleanNewUsername !== oldUsername) {
      const db = mongoose.connection.db;
      const oldClean = oldUsername.replace(/[^a-z0-9_]/g, '_');
      const newClean = cleanNewUsername.replace(/[^a-z0-9_]/g, '_');

      // Migrate documents collection
      try {
        const oldDocColName = `documents_${oldClean}`;
        const newDocColName = `documents_${newClean}`;
        const collections = await db.listCollections().toArray();
        const colNames = collections.map(c => c.name);

        if (colNames.includes(oldDocColName)) {
          if (colNames.includes(newDocColName)) {
            const oldCol = db.collection(oldDocColName);
            const newCol = db.collection(newDocColName);
            const docs = await oldCol.find({}).toArray();
            if (docs.length > 0) {
              const cleaned = docs.map(d => {
                const copy = { ...d };
                delete copy._id;
                copy.createdBy = cleanNewUsername;
                return copy;
              });
              await newCol.insertMany(cleaned);
            }
            await oldCol.drop();
          } else {
            await db.collection(oldDocColName).rename(newDocColName);
            await db.collection(newDocColName).updateMany({}, { $set: { createdBy: cleanNewUsername } });
          }
        }
      } catch (colErr) {
        console.warn('Document collection migration notice:', colErr.message);
      }

      // Migrate scanned documents collection
      try {
        const oldScannedColName = `scanned_documents_${oldClean}`;
        const newScannedColName = `scanned_documents_${newClean}`;
        const collections = await db.listCollections().toArray();
        const colNames = collections.map(c => c.name);

        if (colNames.includes(oldScannedColName)) {
          if (colNames.includes(newScannedColName)) {
            const oldCol = db.collection(oldScannedColName);
            const newCol = db.collection(newScannedColName);
            const docs = await oldCol.find({}).toArray();
            if (docs.length > 0) {
              const cleaned = docs.map(d => {
                const copy = { ...d };
                delete copy._id;
                copy.createdBy = cleanNewUsername;
                return copy;
              });
              await newCol.insertMany(cleaned);
            }
            await oldCol.drop();
          } else {
            await db.collection(oldScannedColName).rename(newScannedColName);
            await db.collection(newScannedColName).updateMany({}, { $set: { createdBy: cleanNewUsername } });
          }
        }
      } catch (scanColErr) {
        console.warn('Scanned document collection migration notice:', scanColErr.message);
      }
    }

    const newToken = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Credentials updated successfully',
      token: newToken,
      user: { id: user._id, username: user.username, role: user.role, offices: user.offices || [] }
    });
  } catch (err) {
    console.error('Update credentials error:', err);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

export default router;
