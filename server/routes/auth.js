const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Easy route to seed users via browser
router.get('/seed', async (req, res) => {
  const users = [
    { username: 'entry1', password: 'password', role: 'DataEntry', name: 'Shed 1 Entry', location: 'SHED NO 1' },
    { username: 'check1', password: 'password', role: 'Checker', name: 'Shed 1 Checker', location: 'SHED NO 1' },
    { username: 'verify1', password: 'password', role: 'Verifier', name: 'Shed 1 Verifier', location: 'SHED NO 1' },
    { username: 'entry2', password: 'password', role: 'DataEntry', name: 'Shed 2 Entry', location: 'SHED NO 2' },
    { username: 'check2', password: 'password', role: 'Checker', name: 'Shed 2 Checker', location: 'SHED NO 2' },
    { username: 'verify2', password: 'password', role: 'Verifier', name: 'Shed 2 Verifier', location: 'SHED NO 2' },
    { username: 'entry3', password: 'password', role: 'DataEntry', name: 'Shed 3 Entry', location: 'SHED NO 3' },
    { username: 'check3', password: 'password', role: 'Checker', name: 'Shed 3 Checker', location: 'SHED NO 3' },
    { username: 'verify3', password: 'password', role: 'Verifier', name: 'Shed 3 Verifier', location: 'SHED NO 3' },
    { username: 'DEVELOPER', password: 'PASSWORD', role: 'Admin', name: 'Super Admin Developer', location: 'Global' }
  ];

  try {
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { username: u.username },
        update: {
          passwordHash: hash,
          plainPassword: u.password,
          role: u.role,
          name: u.name,
          location: u.location
        },
        create: {
          username: u.username,
          passwordHash: hash,
          plainPassword: u.password,
          role: u.role,
          name: u.name,
          location: u.location
        }
      });
    }
    res.json({ message: 'Users seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name, location: user.location }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, location: user.location } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name, location: user.location });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
