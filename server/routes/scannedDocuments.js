import express from 'express';
import mongoose from 'mongoose';
import { getUserScannedDocumentModel } from '../models/ScannedDocument.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Protect all scanned document endpoints with JWT Auth
router.use(requireAuth);

let memoryScannedStore = [];
let memoryIdCounter = 1;

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function formatScannedDoc(d) {
  return {
    id: d._id ? d._id.toString() : d.id,
    title: d.title,
    trackingNo: d.trackingNo || 'NONE',
    linkedDocId: d.linkedDocId || '',
    date: d.date,
    pages: d.pages || [],
    fileSize: d.fileSize || 0,
    notes: d.notes || '',
    createdBy: d.createdBy,
    createdAt: d.createdAt
  };
}

// ─── GET User-Specific Scanned Documents ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const currentUsername = req.user.username;
    const { date } = req.query;

    if (isMongoConnected()) {
      const UserScannedModel = getUserScannedDocumentModel(currentUsername);
      const query = {};
      if (date) query.date = date;

      const docs = await UserScannedModel.find(query).sort({ createdAt: -1 });
      return res.json(docs.map(formatScannedDoc));
    }

    // Fallback: Return memory-stored scanned documents for user
    let userDocs = memoryScannedStore.filter(d => d.createdBy === currentUsername);
    if (date) userDocs = userDocs.filter(d => d.date === date);
    res.json(userDocs);
  } catch (err) {
    console.error('Fetch scanned docs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch scanned documents' });
  }
});

// ─── POST Create Scanned Document ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, trackingNo, linkedDocId, date, pages, notes } = req.body;
    const currentUsername = req.user.username;

    if (!title || !pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: 'Title and at least 1 scanned page are required' });
    }

    // Calculate approximate total size in bytes
    const totalChars = pages.reduce((acc, p) => acc + (p ? p.length : 0), 0);
    const fileSize = Math.round(totalChars * 0.75);

    const docData = {
      title: title.trim(),
      trackingNo: (trackingNo || 'NONE').trim(),
      linkedDocId: (linkedDocId || '').trim(),
      date: date || new Date().toISOString().split('T')[0],
      pages,
      fileSize,
      notes: (notes || '').trim(),
      createdBy: currentUsername,
      createdAt: new Date()
    };

    if (isMongoConnected()) {
      const UserScannedModel = getUserScannedDocumentModel(currentUsername);
      const newDoc = new UserScannedModel(docData);
      const savedDoc = await newDoc.save();
      return res.status(201).json(formatScannedDoc(savedDoc));
    }

    // Fallback: Store in memory
    const memoryDoc = {
      id: `scanned_${Date.now()}_${memoryIdCounter++}`,
      ...docData
    };
    memoryScannedStore.unshift(memoryDoc);
    res.status(201).json(memoryDoc);
  } catch (err) {
    console.error('Save scanned doc error:', err.message);
    res.status(500).json({ error: 'Failed to save scanned document' });
  }
});

// ─── DELETE Single Scanned Document ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      const UserScannedModel = getUserScannedDocumentModel(currentUsername);
      const deleted = await UserScannedModel.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Scanned document not found' });
      }
      return res.json({ message: 'Scanned document deleted successfully', id });
    }

    // Memory fallback delete
    const idx = memoryScannedStore.findIndex(d => d.id === id && d.createdBy === currentUsername);
    if (idx === -1) {
      return res.status(404).json({ error: 'Scanned document not found' });
    }
    memoryScannedStore.splice(idx, 1);
    res.json({ message: 'Scanned document deleted successfully', id });
  } catch (err) {
    console.error('Delete scanned doc error:', err.message);
    res.status(500).json({ error: 'Failed to delete scanned document' });
  }
});

// ─── POST Batch Delete Scanned Documents ────────────────────────────────
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const currentUsername = req.user.username;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of document IDs is required' });
    }

    if (isMongoConnected()) {
      const UserScannedModel = getUserScannedDocumentModel(currentUsername);
      await UserScannedModel.deleteMany({ _id: { $in: ids } });
      return res.json({ message: `Deleted ${ids.length} scanned documents`, ids });
    }

    // Memory fallback batch delete
    memoryScannedStore = memoryScannedStore.filter(d => !(ids.includes(d.id) && d.createdBy === currentUsername));
    res.json({ message: `Deleted ${ids.length} scanned documents`, ids });
  } catch (err) {
    console.error('Batch delete error:', err.message);
    res.status(500).json({ error: 'Failed to batch delete scanned documents' });
  }
});

export default router;
