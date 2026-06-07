const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'zapizza.db');
let db = null;

async function getDB() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  setupSchema();
  seedData();
  return db;
}

function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function setupSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      tag TEXT,
      available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      order_type TEXT DEFAULT 'delivery',
      status TEXT DEFAULT 'pending',
      subtotal REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );
  `);
  saveDB();
}

function seedData() {
  const check = query('SELECT COUNT(*) as c FROM users');
  if (check[0]?.c > 0) return;

  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('zapizza123', 10);
  run('INSERT INTO users (username, password, role) VALUES (?,?,?)', ['admin', hash, 'admin']);

  const cats = [
    ['Signature Pies', 'signature', 1],
    ['White Pizzas', 'white', 2],
    ['Sides & Starters', 'sides', 3],
    ['Desserts', 'desserts', 4],
    ['Drinks', 'drinks', 5],
  ];
  cats.forEach(([name, slug, order]) =>
    run('INSERT INTO categories (name, slug, sort_order) VALUES (?,?,?)', [name, slug, order])
  );

  const items = [
    [1, 'Margherita Classica', 'San Marzano DOP · Fior di latte · Fresh basil · EVOO', 649, 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600&q=80', 'Bestseller', 1],
    [1, 'Diavola Infernale', 'Calabrian chilli · Spicy salami · Smoked provola', 749, 'https://images.unsplash.com/photo-1548369937-47519962c11a?w=600&q=80', null, 2],
    [1, 'Tartufo Nero', 'Black truffle · Porcini · Fontina · Rosemary', 1149, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', "Chef's Special", 3],
    [1, 'Prosciutto Crudo', 'San Daniele prosciutto · Rocket · Parmigiano · Cherry tomato', 949, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', null, 4],
    [2, 'Burrata Bianca', 'Fresh burrata · Garlic cream · Basil oil · Pine nuts', 849, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80', 'New', 5],
    [2, 'Quattro Formaggi', 'Fior di latte · Fontina · Gorgonzola · Parmigiano', 799, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&q=80', null, 6],
    [3, 'Garlic Bread', 'Sourdough · Roasted garlic · EVOO · Sea salt', 249, null, null, 7],
    [3, 'Arancini (4 pcs)', 'Saffron rice · Mozzarella · Tomato ragu', 349, null, null, 8],
    [4, 'Tiramisu', 'Classic Italian · Mascarpone · Espresso · Cocoa', 299, null, null, 9],
    [5, 'San Pellegrino', 'Sparkling mineral water 750ml', 149, null, null, 10],
  ];
  items.forEach(([cat, name, desc, price, img, tag, order]) =>
    run('INSERT INTO menu_items (category_id, name, description, price, image_url, tag, sort_order) VALUES (?,?,?,?,?,?,?)',
      [cat, name, desc, price, img, tag, order])
  );

  // Sample orders
  const names = ['Rahul Sharma', 'Priya Singh', 'Amit Patel', 'Neha Gupta', 'Vikram Mehta', 'Ananya Nair', 'Rohan Joshi'];
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  for (let i = 0; i < 22; i++) {
    const num = `ZP-${String(1000 + i).padStart(4, '0')}`;
    const name = names[i % names.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const total = Math.round((Math.random() * 2400 + 600) * 100) / 100;
    const tax = Math.round(total * 0.05 * 100) / 100;
    const subtotal = Math.round((total - tax) * 100) / 100;
    const type = i % 3 === 0 ? 'dine-in' : 'delivery';
    const daysAgo = Math.floor(Math.random() * 7);
    const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
    run(`INSERT INTO orders (order_number, customer_name, customer_phone, order_type, status, subtotal, tax, total, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [num, name, `98${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`, type, status, subtotal, tax, total, ts]);
  }

  console.log('✅ Database seeded — admin / zapizza123');
}

// Returns array of plain objects
function query(sql, params = []) {
  if (!db) throw new Error('DB not initialized');
  const safe = params.map(p => (p === undefined ? null : p));
  const stmt = db.prepare(sql);
  stmt.bind(safe);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Executes a write statement, returns { lastInsertRowid }
function run(sql, params = []) {
  if (!db) throw new Error('DB not initialized');
  const safe = params.map(p => (p === undefined ? null : p));
  db.run(sql, safe);
  // IMPORTANT: read last_insert_rowid BEFORE export() — export() resets it to 0
  const idRes = db.exec('SELECT last_insert_rowid()');
  const lastInsertRowid = idRes[0]?.values[0][0] ?? null;
  saveDB();
  return { lastInsertRowid };
}

module.exports = { getDB, query, run, saveDB };
