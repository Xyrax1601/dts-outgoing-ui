import mongoose from 'mongoose';

export const documentSchema = new mongoose.Schema({
  trackingNo: {
    type: String,
    default: 'NONE',
    trim: true
  },
  fromOffice: {
    type: String,
    default: '',
    trim: true
  },
  details: {
    type: String,
    default: '',
    trim: true
  },
  receivedBy: {
    type: String,
    default: '',
    trim: true
  },
  toOffice: {
    type: String,
    default: '',
    trim: true
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  kind: {
    type: String,
    enum: ['forward', 'receive'],
    default: 'forward'
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

export const Document = mongoose.model('Document', documentSchema);

/**
 * Returns a Mongoose model bound specifically to a dedicated user collection: documents_<username>
 */
export function getUserDocumentModel(username) {
  const cleanUser = String(username || 'system').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const collectionName = `documents_${cleanUser}`;
  const modelName = `Document_${cleanUser}`;

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  return mongoose.model(modelName, documentSchema, collectionName);
}
