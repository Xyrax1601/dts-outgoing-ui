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

export default router;
