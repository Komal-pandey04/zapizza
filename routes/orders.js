const router = require('express').Router();
const { query, run } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

/* ── Dashboard stats ─────────────────────────────────────────── */
router.get('/stats', authMiddleware, (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({
    total_orders:   query('SELECT COUNT(*) as c FROM orders')[0]?.c ?? 0,
    today_orders:   query("SELECT COUNT(*) as c FROM orders WHERE date(created_at)=?", [today])[0]?.c ?? 0,
    today_revenue:  query("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE date(created_at)=? AND status!='cancelled'", [today])[0]?.r ?? 0,
    total_revenue:  query("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status!='cancelled'")[0]?.r ?? 0,
    pending:        query("SELECT COUNT(*) as c FROM orders WHERE status='pending'")[0]?.c ?? 0,
    preparing:      query("SELECT COUNT(*) as c FROM orders WHERE status='preparing'")[0]?.c ?? 0,
    by_status:      query("SELECT status, COUNT(*) as count FROM orders GROUP BY status"),
    recent:         query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"),
    weekly:         query(`
      SELECT date(created_at) as day, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
      FROM orders
      WHERE created_at >= date('now','-7 days') AND status!='cancelled'
      GROUP BY date(created_at)
      ORDER BY day
    `),
  });
});

/* ── List (paginated, filtered) ──────────────────────────────── */
router.get('/', authMiddleware, (req, res) => {
  const { status, type, search, page = 1, limit = 15 } = req.query;
  let sql = 'FROM orders WHERE 1=1';
  const p = [];
  if (status) { sql += ' AND status=?';  p.push(status); }
  if (type)   { sql += ' AND order_type=?'; p.push(type); }
  if (search) { sql += ' AND (customer_name LIKE ? OR order_number LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }

  const total  = query(`SELECT COUNT(*) as c ${sql}`, p)[0]?.c ?? 0;
  const offset = (Number(page) - 1) * Number(limit);
  const orders = query(`SELECT * ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...p, Number(limit), offset]);

  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

/* ── Single order ────────────────────────────────────────────── */
router.get('/:id', authMiddleware, (req, res) => {
  const order = query('SELECT * FROM orders WHERE id=?', [req.params.id])[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = query('SELECT * FROM order_items WHERE order_id=?', [req.params.id]);
  res.json({ ...order, items });
});

/* ── Create order (public — called from frontend) ────────────── */
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_address, order_type = 'delivery', items, notes } = req.body;
  if (!customer_name)  return res.status(400).json({ error: 'customer_name is required' });
  if (!items?.length)  return res.status(400).json({ error: 'items array is required' });

  // Validate + enrich items
  let subtotal = 0;
  const enriched = [];
  for (const item of items) {
    const mi = query('SELECT * FROM menu_items WHERE id=? AND available=1', [item.menu_item_id])[0];
    if (!mi) return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found or unavailable` });
    const qty = Number(item.quantity) || 1;
    const lineTotal = Math.round(mi.price * qty * 100) / 100;
    subtotal += lineTotal;
    enriched.push({ menu_item_id: mi.id, name: mi.name, price: mi.price, quantity: qty, subtotal: lineTotal });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const tax   = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const order_number = `ZP-${Date.now().toString().slice(-7)}`;

  const { lastInsertRowid: orderId } = run(
    `INSERT INTO orders (order_number,customer_name,customer_phone,customer_address,order_type,status,subtotal,tax,total,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [order_number, customer_name, customer_phone || null, customer_address || null, order_type, 'pending', subtotal, tax, total, notes || null]
  );

  for (const i of enriched) {
    run('INSERT INTO order_items (order_id,menu_item_id,name,price,quantity,subtotal) VALUES (?,?,?,?,?,?)',
      [orderId, i.menu_item_id, i.name, i.price, i.quantity, i.subtotal]);
  }

  res.status(201).json(query('SELECT * FROM orders WHERE id=?', [orderId])[0]);
});

/* ── Update status ───────────────────────────────────────────── */
router.patch('/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status))
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, req.params.id]);
  res.json(query('SELECT * FROM orders WHERE id=?', [req.params.id])[0]);
});

/* ── Delete ──────────────────────────────────────────────────── */
router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM order_items WHERE order_id=?', [req.params.id]);
  run('DELETE FROM orders WHERE id=?', [req.params.id]);
  res.json({ message: 'Order deleted' });
});

module.exports = router;
