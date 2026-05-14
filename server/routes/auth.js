const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// NUCLEAR FIX: Create tables + seed users in one URL visit
router.get('/seed', async (req, res) => {
  try {
    // Step 1: Force-create all database tables using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "location" TEXT,
        "plainPassword" TEXT
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "type" TEXT NOT NULL,
        "data" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "location" TEXT NOT NULL,
        "itemName" TEXT NOT NULL,
        "createdById" INTEGER NOT NULL,
        "checkedById" INTEGER,
        "checkedAt" DATETIME,
        "verifiedById" INTEGER,
        "verifiedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("createdById") REFERENCES "User"("id"),
        FOREIGN KEY ("checkedById") REFERENCES "User"("id"),
        FOREIGN KEY ("verifiedById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DocumentWorkflowLog" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "documentId" INTEGER NOT NULL,
        "action" TEXT NOT NULL,
        "userId" INTEGER NOT NULL,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("documentId") REFERENCES "Document"("id"),
        FOREIGN KEY ("userId") REFERENCES "User"("id")
      )
    `);

    // Step 2: Seed users
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

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      // Use raw SQL to avoid any Prisma schema mismatch
      await prisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO "User" ("username", "passwordHash", "name", "role", "location", "plainPassword") VALUES (?, ?, ?, ?, ?, ?)`,
        u.username, hash, u.name, u.role, u.location, u.password
      );
    }

    // Step 3: Seed 30 Dummy Documents for the Dashboard
    const entryUser = await prisma.$queryRawUnsafe(`SELECT id FROM "User" WHERE "username" = 'entry1' LIMIT 1`);
    const checkUser = await prisma.$queryRawUnsafe(`SELECT id FROM "User" WHERE "username" = 'check1' LIMIT 1`);
    const verifyUser = await prisma.$queryRawUnsafe(`SELECT id FROM "User" WHERE "username" = 'verify1' LIMIT 1`);

    if (entryUser.length > 0) {
      const entryId = entryUser[0].id;
      const checkId = checkUser[0].id;
      const verifyId = verifyUser[0].id;

      // Clear old dummy data first
      await prisma.$executeRawUnsafe(`DELETE FROM "Document"`);

      const types = ['Packing Shift Report', 'Laminate Record for GSM Verification', 'First Piece Approval', 'Daily Quality Check'];
      const sheds = ['SHED NO 1', 'SHED NO 2', 'SHED NO 3'];
      const items = ['ADDITIVE', 'INK', 'Makeup', 'Laminate', 'Solvent'];
      const statuses = ['Completed', 'Pending at Checked By', 'Pending at Verified By'];

      for (let i = 0; i < 30; i++) {
        const type = types[i % 4];
        const shed = sheds[i % 3];
        const item = items[i % 5];
        const status = statuses[i % 3];
        const daysAgo = i % 15;
        const dateStr = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const data = JSON.stringify({
          batchNumber: `BTCH-2026-${100 + i}`,
          quantity: 1000 + (i * 50),
          remarks: 'Standard production run. All parameters verified.',
          temperature: '24°C',
          humidity: '45%'
        });

        const checkedById = status !== 'Pending at Checked By' ? checkId : null;
        const checkedAt = status !== 'Pending at Checked By' ? dateStr : null;
        const verifiedById = status === 'Completed' ? verifyId : null;
        const verifiedAt = status === 'Completed' ? dateStr : null;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "Document" ("type", "data", "status", "location", "itemName", "createdById", "checkedById", "checkedAt", "verifiedById", "verifiedAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          type, data, status, shed, item, entryId, checkedById, checkedAt, verifiedById, verifiedAt, dateStr, dateStr
        );
      }
    }

    res.json({ message: '✅ Tables created, 10 users seeded, and 30 demo documents generated! You can now log in with DEVELOPER / PASSWORD' });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
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
