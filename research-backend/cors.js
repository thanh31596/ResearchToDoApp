app.use(cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://vercel.app',
      'https://*.vercel.app',
      'https://netlify.app',
      'https://*.netlify.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));