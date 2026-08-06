import mongoose from 'mongoose';

export const scannedDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  trackingNo: {
    type: String,
    default: 'NONE',
    trim: true
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  pages: [{
    type: String, // Array of compressed base64 image data strings
    required: true
  }],
  fileSize: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const ScannedDocument = mongoose.model('ScannedDocument', scannedDocumentSchema);

/**
 * Returns a Mongoose model bound specifically to a dedicated user collection: scanned_documents_<username>
 */
export function getUserScannedDocumentModel(username) {
  const cleanUser = String(username || 'system').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const collectionName = `scanned_documents_${cleanUser}`;
  const modelName = `ScannedDocument_${cleanUser}`;

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  return mongoose.model(modelName, scannedDocumentSchema, collectionName);
}
