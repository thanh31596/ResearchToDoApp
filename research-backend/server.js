// server.js - Main server file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/research_app',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.set('trust proxy', true);
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://vercel.app',
    'https://*.vercel.app',
    'https://researchtodoapp-production.up.railway.app',
    /^https:\/\/.*\.vercel\.app$/,
    'https://stephenresearch.app',
    'https://www.stephenresearch.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
// ADD this middleware to handle Railway's host headers:
app.use((req, res, next) => {
  // Trust Railway's host headers
  const allowedHosts = [
    'localhost:5000',
    'researchtodoapp-production.up.railway.app'
  ];
  
  const host = req.get('host');
  const origin = req.get('origin');
  
  // Log for debugging
  console.log('Request host:', host);
  console.log('Request origin:', origin);
  
  next();
});
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Database initialization
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(20) DEFAULT 'planned',
        deadline DATE,
        progress INTEGER DEFAULT 0,
        estimated_hours INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Phases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phases (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        phase_order INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        deadline DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Time tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_seconds INTEGER,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Auth Routes
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [email, passwordHash, fullName]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ticket Routes
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const ticketsResult = await pool.query(`
      SELECT t.*, 
             json_agg(
               json_build_object(
                 'id', p.id,
                 'name', p.name,
                 'start_date', p.start_date,
                 'end_date', p.end_date,
                 'completed', p.completed,
                 'phase_order', p.phase_order
               ) ORDER BY p.phase_order
             ) FILTER (WHERE p.id IS NOT NULL) as phases
      FROM tickets t
      LEFT JOIN phases p ON t.id = p.ticket_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [req.user.userId]);

    // Get tasks for each ticket
    for (let ticket of ticketsResult.rows) {
      const tasksResult = await pool.query(`
        SELECT id, title, completed, deadline, phase_id
        FROM tasks
        WHERE ticket_id = $1
        ORDER BY created_at
      `, [ticket.id]);
      
      ticket.tasks = tasksResult.rows;
    }

    res.json(ticketsResult.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tickets', authenticateToken, [
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('deadline').optional().isISO8601(),
  body('estimatedHours').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, deadline, estimatedHours, phases, tasks } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create ticket
      const ticketResult = await client.query(`
        INSERT INTO tickets (user_id, title, description, priority, deadline, estimated_hours)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [req.user.userId, title, description, priority || 'Medium', deadline, estimatedHours || 0]);

      const ticket = ticketResult.rows[0];

      // Create phases
      const createdPhases = [];
      if (phases && phases.length > 0) {
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          const phaseResult = await client.query(`
            INSERT INTO phases (ticket_id, name, start_date, end_date, phase_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [ticket.id, phase.name, phase.start_date, phase.end_date, i + 1]);
          createdPhases.push(phaseResult.rows[0]);
        }
      }

      // Create tasks
      const createdTasks = [];
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          const phaseId = createdPhases.find(p => p.phase_order === task.phase)?.id;
          const taskResult = await client.query(`
            INSERT INTO tasks (ticket_id, phase_id, title, deadline)
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `, [ticket.id, phaseId, task.title, task.deadline]);
          createdTasks.push(taskResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...ticket,
        phases: createdPhases,
        tasks: createdTasks
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, deadline, status, progress } = req.body;

    const result = await pool.query(`
      UPDATE tickets 
      SET title = $1, description = $2, priority = $3, deadline = $4, status = $5, progress = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [title, description, priority, deadline, status, progress, id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tickets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task Routes
app.put('/api/tasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First verify the task belongs to the user
    const taskCheck = await pool.query(`
      SELECT t.id, t.completed, tk.user_id 
      FROM tasks t
      JOIN tickets tk ON t.ticket_id = tk.id
      WHERE t.id = $1 AND tk.user_id = $2
    `, [id, req.user.userId]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newCompleted = !taskCheck.rows[0].completed;

    const result = await pool.query(`
      UPDATE tasks 
      SET completed = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [newCompleted, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, deadline, completed } = req.body;

    const result = await pool.query(`
      UPDATE tasks t
      SET title = $1, deadline = $2, completed = $3, updated_at = CURRENT_TIMESTAMP
      FROM tickets tk
      WHERE t.id = $4 AND t.ticket_id = tk.id AND tk.user_id = $5
      RETURNING t.*
    `, [title, deadline, completed, id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Time Tracking Routes
app.post('/api/time-tracking/start', authenticateToken, async (req, res) => {
  try {
    const { taskId, ticketId } = req.body;

    // Stop any existing active timer
    await pool.query(`
      UPDATE time_tracking 
      SET end_time = CURRENT_TIMESTAMP,
          duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::integer
      WHERE user_id = $1 AND end_time IS NULL
    `, [req.user.userId]);

    // Start new timer
    const result = await pool.query(`
      INSERT INTO time_tracking (user_id, task_id, ticket_id, start_time)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `, [req.user.userId, taskId, ticketId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/time-tracking/stop', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE time_tracking 
      SET end_time = CURRENT_TIMESTAMP,
          duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::integer
      WHERE user_id = $1 AND end_time IS NULL
      RETURNING *
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active timer found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/time-tracking/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tt.*, t.title as task_title, tk.title as ticket_title
      FROM time_tracking tt
      JOIN tasks t ON tt.task_id = t.id
      JOIN tickets tk ON tt.ticket_id = tk.id
      WHERE tt.user_id = $1 AND tt.end_time IS NULL
    `, [req.user.userId]);

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/time-tracking/summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        task_id,
        ticket_id,
        SUM(duration_seconds) as total_seconds,
        COUNT(*) as session_count
      FROM time_tracking
      WHERE user_id = $1 AND date = $2 AND duration_seconds IS NOT NULL
      GROUP BY task_id, ticket_id
    `, [req.user.userId, targetDate]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching time summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Integration Route (Gemini)
app.post('/api/ai/generate-plan', authenticateToken, async (req, res) => {
  try {
    const { description } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an AI research productivity assistant. The user wants to create a new research project/task: "${description}"

Create a comprehensive project plan with the following structure. 

CRITICAL: Respond with ONLY valid JSON. Do not include markdown code blocks, backticks, or any other formatting. Just pure JSON.

{
  "title": "Clear, concise project title",
  "description": "Detailed description of the project",
  "priority": "High|Medium|Low",
  "deadline": "YYYY-MM-DD (estimate a reasonable deadline 1-6 months from now)",
  "estimatedHours": number (total estimated hours),
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "completed": false
    }
  ],
  "tasks": [
    {
      "id": 1,
      "title": "Specific actionable task",
      "phase": 1,
      "completed": false,
      "deadline": "YYYY-MM-DD"
    }
  ]
}

Rules:
- Create 3-5 logical phases that build upon each other
- Each phase should have 5-15 specific, actionable tasks
- Deadlines should be realistic and well-spaced
- Consider research workflows: literature review → methodology → experimentation → analysis → writing
- Tasks should be specific enough to complete in 1-4 hours each
- Start dates should be today (${new Date().toISOString().split('T')[0]}) or later
- Make it comprehensive but realistic for academic research

IMPORTANT: Return ONLY the JSON object. No markdown formatting, no backticks, no explanatory text.`
          }]
        }]
      })
    });

    const result = await response.json();
    let responseText = result.candidates[0].content.parts[0].text;
    
    // Clean up markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    responseText = responseText.replace(/^[^{]*({.*})[^}]*$/s, '$1');
    
    const planData = JSON.parse(responseText);

    res.json(planData);
  } catch (error) {
    console.error('Error generating AI plan:', error);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// Export/Import Routes
app.get('/api/export', authenticateToken, async (req, res) => {
  try {
    // Get all user data
    const tickets = await pool.query(`
      SELECT t.*, 
             json_agg(
               json_build_object(
                 'id', p.id,
                 'name', p.name,
                 'start_date', p.start_date,
                 'end_date', p.end_date,
                 'completed', p.completed,
                 'phase_order', p.phase_order
               ) ORDER BY p.phase_order
             ) FILTER (WHERE p.id IS NOT NULL) as phases
      FROM tickets t
      LEFT JOIN phases p ON t.id = p.ticket_id
      WHERE t.user_id = $1
      GROUP BY t.id
    `, [req.user.userId]);

    // Get all tasks
    for (let ticket of tickets.rows) {
      const tasks = await pool.query(`
        SELECT id, title, completed, deadline, phase_id
        FROM tasks
        WHERE ticket_id = $1
      `, [ticket.id]);
      ticket.tasks = tasks.rows;
    }

    // Get time tracking data
    const timeTracking = await pool.query(`
      SELECT task_id, ticket_id, duration_seconds, date
      FROM time_tracking
      WHERE user_id = $1 AND duration_seconds IS NOT NULL
    `, [req.user.userId]);

    const exportData = {
      exportDate: new Date().toISOString(),
      tickets: tickets.rows,
      timeTracking: timeTracking.rows
    };

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT 1');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: dbCheck ? 'Connected' : 'Disconnected',
      uptime: process.uptime(),
      host: req.get('host'),
      userAgent: req.get('user-agent'),
      method: req.method,
      url: req.url,
      headers: {
        host: req.get('host'),
        origin: req.get('origin'),
        referer: req.get('referer')
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      host: req.get('host')
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
app.get('/', (req, res) => {
  res.json({
    message: 'Research Productivity Backend API',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      tickets: '/api/tickets',
      ai: '/api/ai/*'
    },
    host: req.get('host')
  });
});

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Research Productivity Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();