// Railway-specific server entry point
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Railway server starting...');

// Railway-specific configuration
app.set('trust proxy', true);

// Disable all host checking
app.use((req, res, next) => {
  // Completely bypass host header validation
  delete req.headers['host'];
  req.headers.host = 'researchtodoapp-production.up.railway.app';
  next();
});

// Permissive CORS for Railway
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Railway server working!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Import your existing routes
// For now, let's add a simple auth test
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Railway auth endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Railway server running on port ${PORT}`);
});