const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, run } = require('../db/database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const user = query('SELECT * FROM users WHERE username = ?', [username])[0];
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET, { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/signup  — create new admin (requires existing admin token)
router.post('/signup', authMiddleware, (req, res) => {
  const { username, password, role = 'admin' } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const existing = query('SELECT id FROM users WHERE username = ?', [username])[0];
  if (existing)
    return res.status(409).json({ error: 'Username already taken' });
  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = run(
    'INSERT INTO users (username, password, role) VALUES (?,?,?)',
    [username, hash, role]
  );
  const newUser = query('SELECT id, username, role, created_at FROM users WHERE id=?', [lastInsertRowid])[0];
  res.status(201).json({ message: 'User created', user: newUser });
});

// GET /api/auth/users — list all admin users (admin only)
router.get('/users', authMiddleware, (_req, res) => {
  const users = query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

// PUT /api/auth/users/:id/password — change password
router.put('/users/:id/password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  const user = query('SELECT * FROM users WHERE id=?', [req.params.id])[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Non-superadmins can only change their own password
  if (req.user.id !== user.id && req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Cannot change another user\'s password' });

  if (!bcrypt.compareSync(current_password, user.password))
    return res.status(401).json({ error: 'Current password is incorrect' });
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  run('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(new_password, 10), req.params.id]);
  res.json({ message: 'Password updated successfully' });
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authMiddleware, (req, res) => {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  const user = query('SELECT id FROM users WHERE id=?', [req.params.id])[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  run('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ message: 'User deleted' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

module.exports = router;
