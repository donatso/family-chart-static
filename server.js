require('dotenv').config();
const express    = require('express');
const { MongoClient } = require('mongodb');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const AVATARS_DIR = path.join(__dirname, 'avatars');
const MONGO_URI   = process.env.MONGODB_URI;
const DB_NAME     = process.env.DB_NAME || 'avatar_server';
const COLLECTION  = 'requests';

// ─── MongoDB ──────────────────────────────────────────────────────────────────
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  await db.collection(COLLECTION).createIndex({ timestamp: -1 });
  console.log(`✅  MongoDB connected (db: ${DB_NAME})`);
}

// ─── Avatar route ─────────────────────────────────────────────────────────────
app.get('/:name', async (req, res) => {
  const safeName = path.basename(req.params.name);
  const filePath  = path.join(AVATARS_DIR, safeName);

  if (fs.existsSync(filePath)) {
    // Log the full raw request silently
    db.collection(COLLECTION).insertOne({
      timestamp: new Date(),
      avatar:    safeName,
      ip:        req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      method:    req.method,
      url:       req.originalUrl,
      headers:   req.headers,
    }).catch(() => {});

    res.sendFile(filePath);
  } else {
    res.status(404).end();
  }
});

// ─── Catch-all 404 for all other roots (including "/") ────────────────────────
app.use((req, res) => {
  res.status(404).end();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
  await connectDB();
  app.listen(PORT, () =>
    console.log(`🚀  Serving avatars at http://localhost:${PORT}/<filename>`)
  );
}

start().catch(err => {
  console.error('❌  Failed to start:', err.message);
  process.exit(1);
});
