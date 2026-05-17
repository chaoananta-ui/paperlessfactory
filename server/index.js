const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');

dotenv.config();

// Programmatic Override: Intercept and redirect IPv6 connection string to IPv4 pooler
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('db.xzppnfbxwjofrwteftka.supabase.co')) {
  console.log('🔄 [System Startup] Redirecting database connection to working IPv4 pooler (aws-1-ap-northeast-1.pooler.supabase.com:6543)...');
  process.env.DATABASE_URL = "postgresql://postgres.xzppnfbxwjofrwteftka:*Gogoi262682%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=4";
}


const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Bulletproof Table Creation on Startup
try {
  console.log('Synchronizing database schema...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('Database schema synchronized successfully.');
} catch (error) {
  console.error('Database synchronization failed:', error.message);
}

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('<h1>🏭 Paperless Factory Backend API is Online & Running!</h1><p>Visit the Netlify URL to access the Frontend Portal.</p><p>Health Check: <a href="/api/health">/api/health</a></p>');
});

app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
