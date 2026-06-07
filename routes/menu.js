const router = require('express').Router();
const { query, run } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

/* ── Public ─────────────────────────────────────────────────── */
router.get('/', (_req, res) => {
  const categories = query('SELECT * FROM categories ORDER BY sort_order');
  const items = query('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order');
  res.json(categories.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) })));
});

router.get('/categories', (_req, res) => {
  res.json(query('SELECT * FROM categories ORDER BY sort_order'));
});

/* ── Admin ───────────────────────────────────────────────────── */
router.get('/items', authMiddleware, (_req, res) => {
  res.json(query(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    ORDER BY m.category_id, m.sort_order
  `));
});

router.get('/items/:id', authMiddleware, (req, res) => {
  const item = query('SELECT * FROM menu_items WHERE id = ?', [req.params.id])[0];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

router.post('/items', authMiddleware, (req, res) => {
  const { category_id, name, description, price, image_url, tag, available = 1 } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
  const { lastInsertRowid } = run(
    'INSERT INTO menu_items (category_id, name, description, price, image_url, tag, available) VALUES (?,?,?,?,?,?,?)',
    [category_id, name, description, price, image_url || null, tag || null, available]
  );
  res.status(201).json(query('SELECT * FROM menu_items WHERE id = ?', [lastInsertRowid])[0]);
});

router.put('/items/:id', authMiddleware, (req, res) => {
  const { category_id, name, description, price, image_url, tag, available } = req.body;
  run(
    'UPDATE menu_items SET category_id=?,name=?,description=?,price=?,image_url=?,tag=?,available=? WHERE id=?',
    [category_id, name, description, price, image_url || null, tag || null, available, req.params.id]
  );
  res.json(query('SELECT * FROM menu_items WHERE id = ?', [req.params.id])[0]);
});

router.patch('/items/:id/toggle', authMiddleware, (req, res) => {
  run('UPDATE menu_items SET available = CASE WHEN available=1 THEN 0 ELSE 1 END WHERE id=?', [req.params.id]);
  res.json(query('SELECT * FROM menu_items WHERE id = ?', [req.params.id])[0]);
});

router.delete('/items/:id', authMiddleware, (req, res) => {
  run('DELETE FROM menu_items WHERE id=?', [req.params.id]);
  res.json({ message: 'Item deleted' });
});

router.post('/categories', authMiddleware, (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  const { lastInsertRowid } = run('INSERT INTO categories (name, slug) VALUES (?,?)', [name, slug]);
  res.status(201).json(query('SELECT * FROM categories WHERE id=?', [lastInsertRowid])[0]);
});

module.exports = router;
