// Frontend HTTP API Client for DTS Express & MongoDB Backend
// In production (Netlify), VITE_API_URL is set to the Render backend URL.
// In local dev, it falls back to http://localhost:5000/api

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class DTSApiClient {
  constructor() {
    this.token = localStorage.getItem('dts_jwt_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('dts_jwt_token', token);
    } else {
      localStorage.removeItem('dts_jwt_token');
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return { online: false, mongoConnected: false };
      const data = await res.json();
      return { online: true, mongoConnected: data.mongoConnected };
    } catch (e) {
      return { online: false, mongoConnected: false };
    }
  }

  async checkStorageUsage() {
    try {
      const res = await fetch(`${API_BASE_URL}/health/storage`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { available: false, usedBytes: 0, limitBytes: 0, usedPercent: 0 };
      return await res.json();
    } catch (e) {
      return { available: false, usedBytes: 0, limitBytes: 0, usedPercent: 0 };
    }
  }

  // Auth Endpoints
  async register(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    this.setToken(data.token);
    return data;
  }

  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this.setToken(data.token);
    return data;
  }

  async getProfile() {
    if (!this.token) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        this.setToken(null);
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch (e) {
      return null;
    }
  }

  async updateUserOffices(offices) {
    if (!this.token) return { offices };
    try {
      const res = await fetch(`${API_BASE_URL}/auth/offices`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ offices })
      });
      if (!res.ok) throw new Error('Failed to update offices on server');
      return await res.json();
    } catch (e) {
      console.warn('Update offices API error:', e);
      return { offices };
    }
  }

  // Document Endpoints
  async fetchDocuments() {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      headers: this.getHeaders()
    });
    if (res.status === 401) {
      this.setToken(null);
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error('Failed to fetch documents from server');
    return await res.json();
  }

  async createDocument(doc) {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error('Failed to create document on server');
    return await res.json();
  }

  async updateDocument(id, doc) {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error('Failed to update document on server');
    return await res.json();
  }

  async deleteDocument(id) {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete document on server');
    return await res.json();
  }

  async deleteBatch(ids) {
    const res = await fetch(`${API_BASE_URL}/documents/batch-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids })
    });
    if (!res.ok) throw new Error('Failed to batch delete documents');
    return await res.json();
  }

  async batchImport(documents, replace = false) {
    const res = await fetch(`${API_BASE_URL}/documents/batch-import`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ documents, replace })
    });
    if (!res.ok) throw new Error('Failed to import documents to server');
    return await res.json();
  }

  // Scanned Document Endpoints
  async fetchScannedDocuments(date = '') {
    const url = new URL(`${API_BASE_URL}/scanned-documents`);
    if (date) url.searchParams.set('date', date);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch scanned documents');
    return await res.json();
  }

  async createScannedDocument(scannedDoc) {
    const res = await fetch(`${API_BASE_URL}/scanned-documents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(scannedDoc)
    });
    if (!res.ok) throw new Error('Failed to save scanned document');
    return await res.json();
  }

  async deleteScannedDocument(id) {
    const res = await fetch(`${API_BASE_URL}/scanned-documents/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete scanned document');
    return await res.json();
  }

  async deleteBatchScannedDocuments(ids) {
    const res = await fetch(`${API_BASE_URL}/scanned-documents/batch-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids })
    });
    if (!res.ok) throw new Error('Failed to batch delete scanned documents');
    return await res.json();
  }
}

export const api = new DTSApiClient();
