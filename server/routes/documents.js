const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to authenticate
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create a new document (DataEntry)
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'DataEntry') return res.status(403).json({ error: 'Forbidden' });
  
  const { type, data, itemName } = req.body;
  // Enforce user's assigned location if they are not an Admin
  const docLocation = req.user.role === 'Admin' ? req.body.location : req.user.location;

  try {
    const doc = await prisma.document.create({
      data: {
        type,
        data: JSON.stringify(data),
        location: docLocation,
        itemName,
        status: 'Pending at Checked By',
        createdById: req.user.userId,
        logs: {
          create: {
            action: 'Created',
            userId: req.user.userId
          }
        }
      }
    });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all documents
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    // If not Admin, only show documents from the user's location
    if (req.user.role !== 'Admin' && req.user.location) {
      where.location = req.user.location;
    }

    const docs = await prisma.document.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        checkedBy: { select: { name: true } },
        verifiedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document status (Checker / Verifier)
router.put('/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'check' or 'verify'
  
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Enforce location matching for Checker and Verifier
    if (req.user.role !== 'Admin' && doc.location !== req.user.location) {
      return res.status(403).json({ error: 'Permission denied: Document location does not match your assigned location' });
    }

    let updateData = {};
    if (action === 'check' && req.user.role === 'Checker' && doc.status === 'Pending at Checked By') {
      updateData = {
        status: 'Pending at Verified By',
        checkedById: req.user.userId,
        checkedAt: new Date()
      };
    } else if (action === 'verify' && req.user.role === 'Verifier' && doc.status === 'Pending at Verified By') {
      updateData = {
        status: 'Completed',
        verifiedById: req.user.userId,
        verifiedAt: new Date()
      };
    } else {
      return res.status(400).json({ error: 'Invalid action or permission denied' });
    }

    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        logs: {
          create: {
            action: action === 'check' ? 'Checked' : 'Verified',
            userId: req.user.userId
          }
        }
      }
    });

    res.json(updatedDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a document (Admin or DEVELOPER only)
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.username !== 'DEVELOPER') return res.status(403).json({ error: 'Access denied: Admin or DEVELOPER only' });
  
  const { id } = req.params;
  try {
    // Delete logs first due to foreign key constraint
    await prisma.documentWorkflowLog.deleteMany({ where: { documentId: parseInt(id) } });
    await prisma.document.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Document and associated logs deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
