const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to authenticate and check for Admin role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'Admin') return res.status(403).json({ error: 'Access denied: Admin only' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Simple in-memory storage for the global announcement and push updates
let currentAnnouncement = "";
let latestPushUpdate = Date.now(); // Timestamp of last push update
let isMaintenanceMode = false; // Global Kill Switch

// --- System Control Routes ---
router.get('/status', async (req, res) => {
  res.json({ 
    announcement: currentAnnouncement,
    latestPushUpdate: latestPushUpdate,
    maintenanceMode: isMaintenanceMode
  });
});

router.post('/announcement', authenticateAdmin, async (req, res) => {
  const { message } = req.body;
  currentAnnouncement = message || "";
  res.json({ message: 'Announcement updated successfully', announcement: currentAnnouncement });
});

router.post('/push-update', authenticateAdmin, async (req, res) => {
  latestPushUpdate = Date.now();
  res.json({ message: 'Push update signal sent to all clients', timestamp: latestPushUpdate });
});

router.post('/maintenance', authenticateAdmin, async (req, res) => {
  isMaintenanceMode = !isMaintenanceMode;
  // Trigger a push update automatically when toggling maintenance
  latestPushUpdate = Date.now(); 
  res.json({ maintenanceMode: isMaintenanceMode });
});

// Get System Health Metrics
router.get('/health', authenticateAdmin, async (req, res) => {
  const os = require('os');
  res.json({
    uptime: os.uptime(),
    memoryUsage: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100), // percentage
    cpuLoad: Math.round(os.loadavg()[0] * 10), // mock percentage based on 1m load
    activeConnections: Math.floor(Math.random() * 20) + 5, // mock
    databaseSize: '12 MB', // mock
    latency: Math.floor(Math.random() * 40) + 10 // mock ms
  });
});

// --- Advanced Admin Features ---

// Get Database Backup (All Users and Documents)
router.get('/backup', authenticateAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, name: true, location: true }
    });
    const documents = await prisma.document.findMany({
      include: { logs: true }
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      factory: "Gogoi Private Limited",
      data: { users, documents }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Global Audit Logs
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const logs = await prisma.documentWorkflowLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to last 100 for performance
      include: {
        user: { select: { name: true, role: true, location: true } },
        document: { select: { id: true, type: true, location: true, status: true } }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        location: true,
        plainPassword: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
router.post('/users', authenticateAdmin, async (req, res) => {
  const { username, password, name, role, location } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        plainPassword: password,
        name,
        role,
        location
      }
    });
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a user (including password if provided)
router.put('/users/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, name, role, location } = req.body;
  
  try {
    let updateData = { username, name, role, location };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.plainPassword = password;
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
