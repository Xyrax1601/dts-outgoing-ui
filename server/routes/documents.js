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

    if (isMongoConnected()) {
      const docs = await Document.find({ createdBy: currentUsername }).sort({ createdAt: -1 });
      return res.json(docs.map(formatMongoDoc));
    }

    // Fallback: Return in-memory documents belonging to current user
    const userDocs = memoryStore.filter(d => d.createdBy === currentUsername);
    res.json(userDocs);
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

    if (isMongoConnected()) {
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
    }

    // Fallback: Save to in-memory store with user ownership
    const memDoc = {
      id: 'mem-' + (memoryIdCounter++),
      trackingNo: trackingNo || 'NONE',
      fromOffice: fromOffice || '',
      details: details || '',
      receivedBy: receivedBy || '',
      toOffice: toOffice || '',
      date: date || new Date().toISOString().split('T')[0],
      type: type === 'receive' ? 'receive' : 'forward',
      createdBy: currentUsername,
      createdAt: new Date().toISOString()
    };
    memoryStore.unshift(memDoc);
    res.status(201).json(memDoc);
  } catch (err) {
    console.error('Create doc error:', err.message);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// ─── PUT Update Document (User Scoped) ──────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { trackingNo, fromOffice, details, receivedBy, toOffice, date, type } = req.body;
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
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
    }

    // Fallback: Update in-memory store with ownership check
    const idx = memoryStore.findIndex(d => d.id === req.params.id && d.createdBy === currentUsername);
    if (idx === -1) return res.status(404).json({ error: 'Document not found or unauthorized' });

    if (trackingNo !== undefined) memoryStore[idx].trackingNo = trackingNo;
    if (fromOffice !== undefined) memoryStore[idx].fromOffice = fromOffice;
    if (details !== undefined) memoryStore[idx].details = details;
    if (receivedBy !== undefined) memoryStore[idx].receivedBy = receivedBy;
    if (toOffice !== undefined) memoryStore[idx].toOffice = toOffice;
    if (date !== undefined) memoryStore[idx].date = date;
    if (type !== undefined) memoryStore[idx].type = type === 'receive' ? 'receive' : 'forward';
    res.json(memoryStore[idx]);
  } catch (err) {
    console.error('Update doc error:', err.message);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// ─── DELETE Single Document (User Scoped) ────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      const result = await Document.findOneAndDelete({ _id: req.params.id, createdBy: currentUsername });
      if (!result) return res.status(404).json({ error: 'Document not found or unauthorized' });
      return res.json({ message: 'Document deleted successfully' });
    }

    const initialLen = memoryStore.length;
    memoryStore = memoryStore.filter(d => !(d.id === req.params.id && d.createdBy === currentUsername));
    if (memoryStore.length === initialLen) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }
    res.json({ message: 'Document deleted successfully' });
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

    if (isMongoConnected()) {
      const resDel = await Document.deleteMany({ _id: { $in: ids }, createdBy: currentUsername });
      return res.json({ message: `${resDel.deletedCount} documents deleted successfully` });
    }

    const idSet = new Set(ids);
    const beforeCount = memoryStore.length;
    memoryStore = memoryStore.filter(d => !(idSet.has(d.id) && d.createdBy === currentUsername));
    const deletedCount = beforeCount - memoryStore.length;
    res.json({ message: `${deletedCount} documents deleted successfully` });
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

    if (isMongoConnected()) {
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
      return res.status(201).json({ message: `Successfully imported ${inserted.length} documents`, count: inserted.length });
    }

    // Fallback: import into in-memory store scoped to current user
    if (replace) {
      memoryStore = memoryStore.filter(d => d.createdBy !== currentUsername);
    }
    const imported = documents.map(d => ({
      id: 'mem-' + (memoryIdCounter++),
      trackingNo: d.trackingNo || 'NONE',
      fromOffice: d.fromOffice || '',
      details: d.details || '',
      receivedBy: d.receivedBy || '',
      toOffice: d.toOffice || '',
      date: d.date || new Date().toISOString().split('T')[0],
      type: d.type === 'receive' ? 'receive' : 'forward',
      createdBy: currentUsername,
      createdAt: new Date().toISOString()
    }));
    memoryStore.push(...imported);
    res.status(201).json({ message: `Successfully imported ${imported.length} documents`, count: imported.length });
  } catch (err) {
    console.error('Batch import error:', err.message);
    res.status(500).json({ error: 'Failed to import documents' });
  }
});

export default router;
