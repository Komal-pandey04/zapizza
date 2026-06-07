const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDB } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/menu',   require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Zapizza API', version: '1.0.0', timestamp: new Date().toISOString() })
);

// ── Pages ────────────────────────────────────────────────────
// Frontend website
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'website.html'))
);

// Admin panel
app.get('/admin', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// SPA fallback (Express 5)
app.get('/{*splat}', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// ── Start ────────────────────────────────────────────────────
getDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
🍕  Zapizza is live!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐  Website    →  http://localhost:${PORT}
📊  Admin      →  http://localhost:${PORT}/admin
🔌  API        →  http://localhost:${PORT}/api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑  Login: admin / zapizza123
`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
