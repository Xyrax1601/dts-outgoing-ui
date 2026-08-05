import express from 'express';
import mongoose from 'mongoose';
import { Document, getUserDocumentModel } from '../models/Document.js';
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

/**
 * Migrates any legacy documents from the old shared 'documents' collection into the user's dedicated collection 'documents_<username>'
 */
async function migrateLegacyUserDocuments(username) {
  if (!isMongoConnected() || !username) return;

  try {
    const UserModel = getUserDocumentModel(username);
    const legacyDocs = await Document.find({
      $or: [
        { createdBy: username },
        { createdBy: username.toLowerCase() }
      ]
    });

    if (legacyDocs.length > 0) {
      console.log(`Migrating ${legacyDocs.length} legacy document(s) for user '${username}' into dedicated collection...`);
      const docsToMigrate = legacyDocs.map(d => ({
        trackingNo: d.trackingNo,
        fromOffice: d.fromOffice,
        details: d.details,
        receivedBy: d.receivedBy,
        toOffice: d.toOffice,
        date: d.date,
        kind: d.kind,
        createdBy: username,
        createdAt: d.createdAt
      }));

      await UserModel.insertMany(docsToMigrate);
      await Document.deleteMany({ _id: { $in: legacyDocs.map(d => d._id) } });
      console.log(`Successfully migrated legacy documents for '${username}'!`);
    }
  } catch (err) {
    console.error(`Legacy migration error for ${username}:`, err.message);
  }
}

// ─── GET User-Specific Documents (From Dedicated User Collection) ────
router.get('/', async (req, res) => {
  try {
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      await migrateLegacyUserDocuments(currentUsername);
      const UserModel = getUserDocumentModel(currentUsername);
      const docs = await UserModel.find().sort({ createdAt: -1 });
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

// ─── POST Create Document (Saved in Dedicated User Collection) ───────
router.post('/', async (req, res) => {
  try {
    const { trackingNo, fromOffice, details, receivedBy, toOffice, date, type } = req.body;
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      const UserModel = getUserDocumentModel(currentUsername);
      const doc = new UserModel({
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

// ─── PUT Update Document (In Dedicated User Collection) ─────────────
router.put('/:id', async (req, res) => {
  try {
    const { trackingNo, fromOffice, details, receivedBy, toOffice, date, type } = req.body;
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      const UserModel = getUserDocumentModel(currentUsername);
      const doc = await UserModel.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found or unauthorized' });

      if (trackingNo !== undefined) doc.trackingNo = trackingNo;
      if (fromOffice !== undefined) doc.fromOffice = fromOffice;
      if (details !== undefined) doc.details = details;
      if (receivedBy !== undefined) doc.receivedBy = receivedBy;
      if (toOffice !== undefined) doc.toOffice = toOffice;
      if (date !== undefined) doc.date = date;
      if (type !== undefined) doc.kind = type === 'receive' ? 'receive' : 'forward';
      doc.createdBy = currentUsername;
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

// ─── DELETE Single Document (In Dedicated User Collection) ───────────
router.delete('/:id', async (req, res) => {
  try {
    const currentUsername = req.user.username;

    if (isMongoConnected()) {
      const UserModel = getUserDocumentModel(currentUsername);
      const result = await UserModel.findByIdAndDelete(req.params.id);
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

// ─── POST Batch Delete (In Dedicated User Collection) ────────────────
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const currentUsername = req.user.username;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Ids array is required' });
    }

    if (isMongoConnected()) {
      const UserModel = getUserDocumentModel(currentUsername);
      const resDel = await UserModel.deleteMany({ _id: { $in: ids } });
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

// ─── POST Batch Import (In Dedicated User Collection) ────────────────
router.post('/batch-import', async (req, res) => {
  try {
    const { documents, replace } = req.body;
    const currentUsername = req.user.username;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    if (isMongoConnected()) {
      const UserModel = getUserDocumentModel(currentUsername);

      // If replace is true, wipe ONLY this user's dedicated collection
      if (replace) {
        await UserModel.deleteMany({});
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
      const inserted = await UserModel.insertMany(docsToInsert);
      return res.status(201).json({ message: `Successfully imported ${inserted.length} documents to MongoDB`, count: inserted.length });
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
