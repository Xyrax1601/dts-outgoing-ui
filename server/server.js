import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';

dotenv.config();

// Fix Node.js Windows SRV lookup ECONNREFUSED issue by setting public DNS resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

let MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/dts_database';

// Remove accidental angle brackets
MONGODB_URI = MONGODB_URI.replace('<', '').replace('>', '');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root Route
app.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DTS API Server Status</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background:#090d16;
          color:white;
          text-align:center;
          padding:40px;
        }

        .card{
          max-width:650px;
          margin:auto;
          background:#121827;
          padding:30px;
          border-radius:12px;
          border:1px solid #1f2937;
        }

        .online{
          color:#22c55e;
        }

        .offline{
          color:#f59e0b;
        }

        a{
          color:#60a5fa;
        }

        button{
          padding:12px 20px;
          border:none;
          background:#2563eb;
          color:white;
          border-radius:8px;
          cursor:pointer;
        }
      </style>
    </head>

    <body>

      <div class="card">

      <h1>DTS Outgoing Backend API</h1>

      <h2 class="${isConnected ? "online" : "offline"}">
      ${isConnected ? "🟢 MongoDB Connected" : "🟡 MongoDB Not Connected"}
      </h2>

      <p>Express Server Status</p>

      <button onclick="window.open('http://localhost:5173')">
      Open DTS Web App
      </button>

      <br><br>

      <a href="/api/health">Health Check</a>

      </div>

    </body>

    </html>
  `);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: "online",
    mongoConnected: mongoose.connection.readyState === 1,
    database: mongoose.connection.name,
    timestamp: new Date()
  });
});

// Storage Stats Endpoint — returns MongoDB Atlas data size vs 512 MB free tier limit
app.get('/api/health/storage', async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    return res.json({ available: false, usedBytes: 0, limitBytes: 0, usedPercent: 0 });
  }

  try {
    const admin = mongoose.connection.db.admin();
    const listDbs = await admin.listDatabases();

    // Sum all databases' data sizes
    const totalUsedBytes = listDbs.databases.reduce((sum, db) => sum + (db.sizeOnDisk || 0), 0);

    // MongoDB Atlas Free Tier M0 = 512 MB data cap
    const LIMIT_BYTES = 512 * 1024 * 1024;
    const usedPercent = Math.min(100, Math.round((totalUsedBytes / LIMIT_BYTES) * 100));

    return res.json({
      available: true,
      usedBytes: totalUsedBytes,
      limitBytes: LIMIT_BYTES,
      usedPercent
    });
  } catch (err) {
    console.error('Storage check error:', err.message);
    return res.json({ available: false, usedBytes: 0, limitBytes: 0, usedPercent: 0 });
  }
});

// Hide password in console
const sanitizedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');

console.log("\n======================================");
console.log("Starting DTS Server...");
console.log("Mongo URI:");
console.log(sanitizedUri);
console.log("======================================\n");

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000
})

  .then(() => {

    console.log("\n======================================");
    console.log("✅ Connected successfully to MongoDB!");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);
    console.log("======================================\n");

    startExpressServer(PORT);

  })

  .catch((err) => {

    console.log("\n======================================");
    console.log("❌ MONGODB CONNECTION FAILED");
    console.log("======================================");

    console.log("\nMessage:");
    console.log(err.message);

    console.log("\nName:");
    console.log(err.name);

    console.log("\nReason:");
    console.log(err.reason);

    console.log("\nCode:");
    console.log(err.code);

    console.log("\nCause:");
    console.log(err.cause);

    console.log("\nComplete Error:");
    console.dir(err, { depth: null });

    console.log("\nStack Trace:");
    console.log(err.stack);

    console.log("\n======================================");

    console.log("\nServer will continue in fallback mode.\n");

    startExpressServer(PORT);

  });

function startExpressServer(port) {

  const server = app.listen(port, () => {

    console.log(`🚀 DTS Express Server running on http://localhost:${port}`);

  });

  server.on('error', (err) => {

    if (err.code === 'EADDRINUSE') {

      console.log(`Port ${port} is already in use.`);

      startExpressServer(port + 1);

    } else {

      console.error(err);

    }

  });

}