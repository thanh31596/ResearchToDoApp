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

// =============================================================================
// RAILWAY FIX - MUST BE FIRST (Before any other middleware)
// =============================================================================

// Trust Railway's proxy setup
app.set('trust proxy', true);

// Disable Express host checking entirely for Railway
app.disable('x-powered-by');

// Railway host header middleware - CRITICAL: Must come before helmet
app.use((req, res, next) => {
  // Force accept Railway host headers
  const originalHost = req.headers.host;
  
  // Log for debugging
  console.log('=== RAILWAY DEBUG ===');
  console.log('Original Host:', originalHost);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
  console.log('X-Forwarded-Host:', req.headers['x-forwarded-host']);
  console.log('====================');
  
  // Override host header validation
  req.headers.host = 'researchtodoapp-production.up.railway.app';
  
  next();
});

// =============================================================================
// MINIMAL HELMET CONFIG FOR RAILWAY
// =============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: false,
  frameguard: false,
  hidePoweredBy: true,
  hsts: false,
  ieNoOpen: false,
  noSniff: false,
  originAgentCluster: false,
  permittedCrossDomainPolicies: false,
  referrerPolicy: false,
  xssFilter: false
}));

// =============================================================================
// RAILWAY-COMPATIBLE CORS
// =============================================================================

app.use(cors({
  origin: function (origin, callback) {
    // Always allow requests for Railway compatibility
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// =============================================================================
// EXPRESS CONFIGURATION
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false,
    require: true
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database client connected');
});

pool.on('error', (err) => {
  console.error('❌ Database client error:', err);
});

// =============================================================================
// RATE LIMITING (Relaxed for Railway)
// =============================================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Very high limit for Railway
  message: { error: 'Too many requests' },
  skip: (req) => {
    // Skip rate limiting for health checks and root
    return req.url === '/' || req.url === '/api/health' || req.url === '/health';
  }
});

app.use('/api/', limiter);

// =============================================================================
// ROOT ENDPOINT (Test Railway Host Header Fix)
// =============================================================================

app.get('/', (req, res) => {
  res.json({
    message: '🚀 Research Productivity Backend API',
    status: 'Running on Railway',
    timestamp: new Date().toISOString(),
    host: req.headers.host,
    environment: process.env.NODE_ENV || 'development',
    railway: {
      originalHost: req.headers['x-forwarded-host'],
      forwardedFor: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    },
    endpoints: {
      health: '/api/health',
      setup: '/api/setup-database',
      auth: '/api/auth/*',
      tickets: '/api/tickets'
    }
  });
});

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time');
    
    // Check for existing tables
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    res.json({
      status: '✅ OK',
      service: 'Research Productivity Backend',
      timestamp: new Date().toISOString(),
      host: req.headers.host,
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: '✅ Connected',
        currentTime: dbTest.rows[0].current_time,
        tables: tableCheck.rows.map(r => r.table_name),
        tableCount: tableCheck.rows.length
      },
      railway: {
        forwardedHost: req.headers['x-forwarded-host'],
        forwardedFor: req.headers['x-forwarded-for']
      },
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: '❌ ERROR',
      service: 'Research Productivity Backend',
      timestamp: new Date().toISOString(),
      host: req.headers.host,
      error: error.message,
      database: {
        status: '❌ Error',
        error: error.message
      }
    });
  }
});

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

const initDatabase = async () => {
  try {
    console.log('🔧 Starting database initialization...');
    
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

    // Notes table - ADD THIS NEW TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT notes_reference_check CHECK (
          (task_id IS NOT NULL AND phase_id IS NULL) OR 
          (task_id IS NULL AND phase_id IS NOT NULL)
        )
      )
    `);

    // Journal entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        entry_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Todo lists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todo_lists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        estimated_time INTEGER DEFAULT 0,
        priority VARCHAR(20) DEFAULT 'Medium',
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Todo items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todo_items (
        id SERIAL PRIMARY KEY,
        todo_list_id INTEGER REFERENCES todo_lists(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        item_type VARCHAR(20) DEFAULT 'bullet', -- 'bullet' or 'numbered'
        estimated_time INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notes_user_task ON notes(user_id, task_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notes_user_phase ON notes(user_id, phase_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, entry_date);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_todo_user ON todo_lists(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_todo_items_list ON todo_items(todo_list_id);
    `);
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// =============================================================================
// DATABASE SETUP ENDPOINT
// =============================================================================

app.get('/api/setup-database', async (req, res) => {
  try {
    console.log('🔧 Manual database setup requested...');
    await initDatabase();
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    res.json({
      success: true,
      message: '🎉 Database initialized successfully!',
      timestamp: new Date().toISOString(),
      tables: tableCheck.rows,
      summary: {
        totalTables: tableCheck.rows.length,
        expectedTables: 5,
        status: tableCheck.rows.length >= 5 ? '✅ Complete' : '⚠️ Incomplete'
      }
    });
  } catch (error) {
    console.error('❌ Database setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: '❌ Database setup failed'
    });
  }
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

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
// =============================================================================
// NOTES ROUTES
// =============================================================================

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, 
             t.title as task_title,
             p.name as phase_name,
             tk.title as ticket_title
      FROM notes n
      LEFT JOIN tasks t ON n.task_id = t.id
      LEFT JOIN phases p ON n.phase_id = p.id
      LEFT JOIN tickets tk ON n.ticket_id = tk.id
      WHERE n.user_id = $1
      ORDER BY n.updated_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/notes/:type/:id', authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;

    let query;
    if (type === 'task') {
      query = `
        SELECT n.* 
        FROM notes n
        JOIN tasks t ON n.task_id = t.id
        JOIN tickets tk ON t.ticket_id = tk.id
        WHERE n.task_id = $1 AND tk.user_id = $2
      `;
    } else if (type === 'phase') {
      query = `
        SELECT n.* 
        FROM notes n
        JOIN phases p ON n.phase_id = p.id
        JOIN tickets tk ON p.ticket_id = tk.id
        WHERE n.phase_id = $1 AND tk.user_id = $2
      `;
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const result = await pool.query(query, [id, req.user.userId]);
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { content, ticketId, taskId, phaseId } = req.body;

    if (!content || !ticketId || (!taskId && !phaseId)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if note already exists
    let existingNote;
    if (taskId) {
      existingNote = await pool.query(
          'SELECT id FROM notes WHERE user_id = $1 AND task_id = $2',
          [req.user.userId, taskId]
      );
    } else {
      existingNote = await pool.query(
          'SELECT id FROM notes WHERE user_id = $1 AND phase_id = $2',
          [req.user.userId, phaseId]
      );
    }

    let result;
    if (existingNote.rows.length > 0) {
      // Update existing note
      result = await pool.query(`
        UPDATE notes 
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `, [content, existingNote.rows[0].id, req.user.userId]);
    } else {
      // Create new note
      result = await pool.query(`
        INSERT INTO notes (user_id, ticket_id, task_id, phase_id, content)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [req.user.userId, ticketId, taskId || null, phaseId || null, content]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const result = await pool.query(`
      UPDATE notes 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [content, id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
        'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/notes/export', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.content,
             t.title as task_title,
             p.name as phase_name,
             tk.title as ticket_title,
             n.created_at,
             n.updated_at
      FROM notes n
      LEFT JOIN tasks t ON n.task_id = t.id
      LEFT JOIN phases p ON n.phase_id = p.id
      LEFT JOIN tickets tk ON n.ticket_id = tk.id
      WHERE n.user_id = $1
      ORDER BY tk.title, p.phase_order, t.created_at
    `, [req.user.userId]);

    // Create markdown export
    let markdown = '# Research Notes Export\n\n';
    markdown += `Export Date: ${new Date().toISOString()}\n\n`;

    let currentTicket = '';
    for (const note of result.rows) {
      if (note.ticket_title !== currentTicket) {
        currentTicket = note.ticket_title;
        markdown += `\n## Project: ${currentTicket}\n\n`;
      }

      if (note.phase_name) {
        markdown += `### Phase: ${note.phase_name}\n`;
      } else if (note.task_title) {
        markdown += `### Task: ${note.task_title}\n`;
      }

      markdown += `${note.content}\n\n`;
      markdown += `*Updated: ${new Date(note.updated_at).toLocaleString()}*\n\n---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=research-notes-${new Date().toISOString().split('T')[0]}.md`);
    res.send(markdown);
  } catch (error) {
    console.error('Error exporting notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// =============================================================================
// AUTH ROUTES
// =============================================================================

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

// =============================================================================
// TICKET ROUTES
// =============================================================================

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

    // Get tasks and notes for each ticket
    for (let ticket of ticketsResult.rows) {
      const tasksResult = await pool.query(`
        SELECT id, title, completed, deadline, phase_id
        FROM tasks
        WHERE ticket_id = $1
        ORDER BY created_at
      `, [ticket.id]);
      
      ticket.tasks = tasksResult.rows;

      // Get notes for phases
      const phaseNotesResult = await pool.query(`
        SELECT n.*, p.id as phase_id
        FROM notes n
        JOIN phases p ON n.phase_id = p.id
        WHERE p.ticket_id = $1
      `, [ticket.id]);

      // Get notes for tasks
      const taskNotesResult = await pool.query(`
        SELECT n.*, t.id as task_id
        FROM notes n
        JOIN tasks t ON n.task_id = t.id
        WHERE t.ticket_id = $1
      `, [ticket.id]);

      // Add notes to phases
      if (ticket.phases) {
        ticket.phases.forEach(phase => {
          const phaseNote = phaseNotesResult.rows.find(n => n.phase_id === phase.id);
          phase.note = phaseNote || null;
        });
      }

      // Add notes to tasks
      ticket.tasks.forEach(task => {
        const taskNote = taskNotesResult.rows.find(n => n.task_id === task.id);
        task.note = taskNote || null;
      });
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

// =============================================================================
// TASK ROUTES
// =============================================================================

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
// =============================================================================
// TASK GUIDANCE ROUTE
// =============================================================================

app.post('/api/ai/task-guidance', authenticateToken, async (req, res) => {
  try {
    const { taskTitle, taskId, projectTitle, projectDescription, phaseInfo } = req.body;
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
            text: `You are an AI research assistant providing detailed, actionable guidance for research tasks.

Project: ${projectTitle}
Project Description: ${projectDescription}
Current Phase: ${phaseInfo.phaseName}
Task: ${taskTitle}

Please provide comprehensive, step-by-step guidance on how to complete this specific task. Include:

1. **Overview**: Brief explanation of what this task entails and why it's important
2. **Prerequisites**: What should be prepared or completed before starting
3. **Step-by-Step Instructions**: Detailed, actionable steps to complete the task
4. **Tools & Resources**: Specific tools, software, or resources that would be helpful
5. **Best Practices**: Tips and recommendations for doing this task effectively
6. **Common Pitfalls**: What to avoid or be careful about
7. **Deliverables**: What should be produced or achieved by the end of this task
8. **Quality Checklist**: How to know if the task is done well

Be specific and practical. Assume the user is a researcher who needs clear, actionable guidance.`
          }]
        }]
      })
    });

    const result = await response.json();
    const guidance = result.candidates[0].content.parts[0].text;

    res.json({ guidance });
  } catch (error) {
    console.error('Error generating task guidance:', error);
    res.status(500).json({ error: 'Failed to generate guidance' });
  }
});
// =============================================================================
// TIME TRACKING ROUTES
// =============================================================================

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

// =============================================================================
// JOURNAL ROUTES
// =============================================================================

app.get('/api/journal', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT * FROM journal_entries 
      WHERE user_id = $1
    `;
    let params = [req.user.userId];

    if (date) {
      query += ` AND entry_date = $2`;
      params.push(date);
    }

    query += ` ORDER BY entry_date DESC, created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/journal', authenticateToken, [
  body('title').trim().isLength({ min: 1 }),
  body('content').trim().isLength({ min: 1 }),
  body('entry_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, entry_date } = req.body;
    const entryDate = entry_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      INSERT INTO journal_entries (user_id, title, content, entry_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.userId, title, content, entryDate]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/journal/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('entry_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content, entry_date } = req.body;

    const result = await pool.query(`
      UPDATE journal_entries 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          entry_date = COALESCE($3, entry_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [title, content, entry_date, id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/journal/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM journal_entries 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// TODO LIST ROUTES
// =============================================================================

app.get('/api/todo-lists', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tl.*, 
             json_agg(
               json_build_object(
                 'id', ti.id,
                 'content', ti.content,
                 'item_type', ti.item_type,
                 'estimated_time', ti.estimated_time,
                 'completed', ti.completed,
                 'order_index', ti.order_index
               ) ORDER BY ti.order_index
             ) FILTER (WHERE ti.id IS NOT NULL) as items
      FROM todo_lists tl
      LEFT JOIN todo_items ti ON tl.id = ti.todo_list_id
      WHERE tl.user_id = $1
      GROUP BY tl.id
      ORDER BY tl.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching todo lists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/todo-lists', authenticateToken, [
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('estimated_time').optional().isInt({ min: 0 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('items').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, estimated_time, priority, items } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create todo list
      const todoListResult = await client.query(`
        INSERT INTO todo_lists (user_id, title, description, estimated_time, priority)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [req.user.userId, title, description || '', estimated_time || 0, priority || 'Medium']);

      const todoList = todoListResult.rows[0];

      // Create todo items if provided
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await client.query(`
            INSERT INTO todo_items (todo_list_id, content, item_type, estimated_time, order_index)
            VALUES ($1, $2, $3, $4, $5)
          `, [todoList.id, item.content, item.item_type || 'bullet', item.estimated_time || 0, i]);
        }
      }

      await client.query('COMMIT');

      // Fetch the complete todo list with items
      const completeResult = await pool.query(`
        SELECT tl.*, 
               json_agg(
                 json_build_object(
                   'id', ti.id,
                   'content', ti.content,
                   'item_type', ti.item_type,
                   'estimated_time', ti.estimated_time,
                   'completed', ti.completed,
                   'order_index', ti.order_index
                 ) ORDER BY ti.order_index
               ) FILTER (WHERE ti.id IS NOT NULL) as items
        FROM todo_lists tl
        LEFT JOIN todo_items ti ON tl.id = ti.todo_list_id
        WHERE tl.id = $1
        GROUP BY tl.id
      `, [todoList.id]);

      res.status(201).json(completeResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating todo list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/todo-lists/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('estimated_time').optional().isInt({ min: 0 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('completed').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, estimated_time, priority, completed } = req.body;

    const result = await pool.query(`
      UPDATE todo_lists 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          estimated_time = COALESCE($3, estimated_time),
          priority = COALESCE($4, priority),
          completed = COALESCE($5, completed),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [title, description, estimated_time, priority, completed, id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo list not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating todo list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/todo-lists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM todo_lists 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo list not found' });
    }

    res.json({ message: 'Todo list deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Todo items routes
app.post('/api/todo-lists/:id/items', authenticateToken, [
  body('content').trim().isLength({ min: 1 }),
  body('item_type').optional().isIn(['bullet', 'numbered']),
  body('estimated_time').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content, item_type, estimated_time } = req.body;

    // Get the next order index
    const orderResult = await pool.query(`
      SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
      FROM todo_items 
      WHERE todo_list_id = $1
    `, [id]);

    const result = await pool.query(`
      INSERT INTO todo_items (todo_list_id, content, item_type, estimated_time, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, content, item_type || 'bullet', estimated_time || 0, orderResult.rows[0].next_order]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating todo item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/todo-items/:id', authenticateToken, [
  body('content').optional().trim().isLength({ min: 1 }),
  body('item_type').optional().isIn(['bullet', 'numbered']),
  body('estimated_time').optional().isInt({ min: 0 }),
  body('completed').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content, item_type, estimated_time, completed } = req.body;

    const result = await pool.query(`
      UPDATE todo_items 
      SET content = COALESCE($1, content),
          item_type = COALESCE($2, item_type),
          estimated_time = COALESCE($3, estimated_time),
          completed = COALESCE($4, completed),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [content, item_type, estimated_time, completed, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating todo item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/todo-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM todo_items 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo item not found' });
    }

    res.json({ message: 'Todo item deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// AI TODO OPTIMIZATION ROUTE
// =============================================================================

app.post('/api/ai/todo-optimization', authenticateToken, async (req, res) => {
  try {
    const { todoList, userContext } = req.body;
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
            text: `You are an AI productivity assistant helping optimize a user's todo list for better time management and efficiency.

Current Todo List:
${JSON.stringify(todoList, null, 2)}

User Context: ${userContext || 'No additional context provided'}

Please analyze this todo list and provide:

1. **Goal Summary**: A concise summary of what the user is trying to achieve
2. **Time Management Suggestions**: Specific recommendations for optimizing time allocation
3. **Priority Optimization**: Suggestions for reordering tasks based on importance and dependencies
4. **Efficiency Tips**: Ways to complete tasks more efficiently
5. **Potential Improvements**: Suggestions for breaking down complex tasks or combining simple ones

Format your response as a JSON object with these sections:
{
  "goalSummary": "Brief summary of the main objective",
  "timeManagement": {
    "suggestions": ["Array of specific time management tips"],
    "estimatedTotalTime": "Total estimated time in hours",
    "recommendedSchedule": "Suggested daily/weekly schedule"
  },
  "priorityOptimization": {
    "reorderedTasks": ["Array of task IDs in recommended order"],
    "reasoning": "Explanation of the priority changes"
  },
  "efficiencyTips": ["Array of efficiency suggestions"],
  "improvements": ["Array of potential improvements"]
}

Be specific, actionable, and realistic. Focus on practical advice that can be implemented immediately.`
          }]
        }]
      })
    });

    const result = await response.json();
    let responseText = result.candidates[0].content.parts[0].text;
    
    // Clean up markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    responseText = responseText.replace(/^[^{]*({.*})[^}]*$/s, '$1');
    
    const optimizationData = JSON.parse(responseText);

    res.json(optimizationData);
  } catch (error) {
    console.error('Error generating todo optimization:', error);
    res.status(500).json({ error: 'Failed to generate optimization' });
  }
});

// =============================================================================
// AI INTEGRATION ROUTE (GEMINI)
// =============================================================================

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
            text: `You are an AI research productivity assistant to help guiding users to have better research progress, you are required to be detailed and specific and realistic. The user wants to create a new research project/task: "${description}"

Create a comprehensive and instructive project plan with the following structure. 

CRITICAL: Respond with ONLY valid JSON. Do not include markdown code blocks, backticks, or any other formatting. Just pure JSON.

{
  "title": "Clear, concise project title",
  "description": "Detailed description of the project",
  "priority": "High|Medium|Low",
  "deadline": "YYYY-MM-DD (estimate a reasonable deadline based on the requirements from the description provided by the user from now.)",
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
      "title": "Specific actionable task, make it sound instructive",
      "phase": 1,
      "completed": false,
      "deadline": "YYYY-MM-DD"
    }
  ]
}


Rules:
- Create 3-10 logical phases that build upon each other
- Each phase should have 5-15 specific, actionable tasks
- Deadlines should be realistic and well-spaced
- Consider research cycle workflows: Background research → Exploration Analysis → Problem Formulation → literature review → methodology → experimentation → analysis → writing
- Tasks should be specific enough to complete in 1-4 hours each
- Start dates should be today (${new Date().toISOString().split('T')[0]}) 
- Each task MUST have a deadline in YYYY-MM-DD format
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

// =============================================================================
// EXPORT/IMPORT ROUTES
// =============================================================================

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

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    host: req.headers.host
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    url: req.url,
    method: req.method,
    host: req.headers.host,
    availableEndpoints: ['/api/health', '/api/auth/*', '/api/tickets', '/api/notes', '/api/setup-database']
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Research Productivity Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 CORS enabled for all origins`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();