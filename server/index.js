const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
