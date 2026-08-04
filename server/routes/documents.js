import express from 'express';
import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Protect all document endpoints with JWT Authentication Middleware
router.use(requireAuth);

// ─── In-Memory Fallback Store ────────────────────────────────────────
// When MongoDB is not connected, this array acts as the server-side store
let memoryStore = [];
let memoryIdCounter = 1;

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function formatMongoDoc(d) {
  return {
    id: d._id.toString(),
    trackingNo: d.trackingNo,
    fromOffice: d.fromOffice,
    details: d.details,
    receivedBy: d.receivedBy,
    toOffice: d.toOffice,
    date: d.date,
    type: d.kind,
    createdBy: d.createdBy,
    createdAt: d.createdAt
  };
}

// ─── GET User-Specific Documents ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const currentUsername = req.user.username;

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is disconnected. Please check database connection.' });
    }

    const docs = await Document.find({ createdBy: currentUsername }).sort({ createdAt: -1 });
    return res.json(docs.map(formatMongoDoc));
  } catch (err) {
    console.error('Fetch docs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── POST Create Document (User Scoped) ──────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { trackingNo, fromOffice, details, receivedBy, toOffice, date, type } = req.body;
    const currentUsername = req.user.username;

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is offline. Active MongoDB connection is required to save records.' });
    }

    const doc = new Document({
      trackingNo: trackingNo || 'NONE',
      fromOffice: fromOffice || '',
      details: details || '',
      receivedBy: receivedBy || '',
      toOffice: toOffice || '',
      date: date || new Date().toISOString().split('T')[0],
      kind: type === 'receive' ? 'receive' : 'forward',
      createdBy: currentUsername
    });
    await doc.save();
    return res.status(201).json(formatMongoDoc(doc));
  } catch (err) {
    console.error('Create doc error:', err.message);
    res.status(500).json({ error: 'Failed to create document in MongoDB' });
  }
});

// ─── PUT Update Document (User Scoped) ──────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { trackingNo, fromOffice, details, receivedBy, toOffice, date, type } = req.body;
    const currentUsername = req.user.username;

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is offline. Active MongoDB connection is required.' });
    }

    const doc = await Document.findOne({ _id: req.params.id, createdBy: currentUsername });
    if (!doc) return res.status(404).json({ error: 'Document not found or unauthorized' });

    if (trackingNo !== undefined) doc.trackingNo = trackingNo;
    if (fromOffice !== undefined) doc.fromOffice = fromOffice;
    if (details !== undefined) doc.details = details;
    if (receivedBy !== undefined) doc.receivedBy = receivedBy;
    if (toOffice !== undefined) doc.toOffice = toOffice;
    if (date !== undefined) doc.date = date;
    if (type !== undefined) doc.kind = type === 'receive' ? 'receive' : 'forward';
    await doc.save();
    return res.json(formatMongoDoc(doc));
  } catch (err) {
    console.error('Update doc error:', err.message);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// ─── DELETE Single Document (User Scoped) ────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const currentUsername = req.user.username;

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is offline. Active MongoDB connection is required.' });
    }

    const result = await Document.findOneAndDelete({ _id: req.params.id, createdBy: currentUsername });
    if (!result) return res.status(404).json({ error: 'Document not found or unauthorized' });
    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete doc error:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── POST Batch Delete (User Scoped) ─────────────────────────────────
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const currentUsername = req.user.username;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Ids array is required' });
    }

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is offline. Active MongoDB connection is required.' });
    }

    const resDel = await Document.deleteMany({ _id: { $in: ids }, createdBy: currentUsername });
    return res.json({ message: `${resDel.deletedCount} documents deleted successfully` });
  } catch (err) {
    console.error('Batch delete error:', err.message);
    res.status(500).json({ error: 'Failed to batch delete documents' });
  }
});

// ─── POST Batch Import (User Scoped) ─────────────────────────────────
router.post('/batch-import', async (req, res) => {
  try {
    const { documents, replace } = req.body;
    const currentUsername = req.user.username;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'MongoDB Cloud is offline. Active MongoDB connection is required.' });
    }

    // If replace is true, replace ONLY documents belonging to this user
    if (replace) {
      await Document.deleteMany({ createdBy: currentUsername });
    }
    const docsToInsert = documents.map(d => ({
      trackingNo: d.trackingNo || 'NONE',
      fromOffice: d.fromOffice || '',
      details: d.details || '',
      receivedBy: d.receivedBy || '',
      toOffice: d.toOffice || '',
      date: d.date || new Date().toISOString().split('T')[0],
      kind: d.type === 'receive' ? 'receive' : 'forward',
      createdBy: currentUsername
    }));
    const inserted = await Document.insertMany(docsToInsert);
    return res.status(201).json({ message: `Successfully imported ${inserted.length} documents to MongoDB`, count: inserted.length });
  } catch (err) {
    console.error('Batch import error:', err.message);
    res.status(500).json({ error: 'Failed to import documents to MongoDB' });
  }
});

export default router;
