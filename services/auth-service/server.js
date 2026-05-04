require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missingVars = REQUIRED_ENV.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('[FATAL] Service cannot start. Fix your .env file and redeploy.');
  process.exit(1); 
}


const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'auth_' });

const httpRequestCounter = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total number of HTTP requests to auth-service',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const authErrorCounter = new client.Counter({
  name: 'auth_errors_total',
  help: 'Total number of authentication errors (invalid credentials)',
  labelNames: ['type'], 
});

const registeredUsersGauge = new client.Gauge({
  name: 'auth_registered_users_total',
  help: 'Total number of registered users in the database',
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
    end(); 
  });
  next();
});

let dbConnected = false;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    dbConnected = true;
    console.log('[INFO] Connected to MongoDB');

    const count = await User.countDocuments();
    registeredUsersGauge.set(count);
  })
  .catch((err) => {
    console.error('[ERROR] MongoDB connection failed:', err.message);
  });

mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  console.warn('[WARN] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  dbConnected = true;
  console.log('[INFO] MongoDB reconnected');
});

  const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);
const User = mongoose.model('User', UserSchema);
 

const User = mongoose.model('User', UserSchema);


app.get('/health', async (req, res) => {
  const dbStatus = dbConnected && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const healthy = dbStatus === 'connected';

  const payload = {
    status: healthy ? 'ok' : 'degraded',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: dbStatus,
    },
  };

  res.status(healthy ? 200 : 503).json(payload);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    authErrorCounter.inc({ type: 'no_token' });
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    authErrorCounter.inc({ type: 'token_invalid' });
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    registeredUsersGauge.inc();

    console.log(`[INFO] New user registered: ${email}`);
    res.status(201).json({ token, user: { id: user._id, name, email: user.email } });
  } catch (err) {
    authErrorCounter.inc({ type: 'server_error' });
    console.error('[ERROR] /register:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      authErrorCounter.inc({ type: 'invalid_credentials' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      authErrorCounter.inc({ type: 'invalid_credentials' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[INFO] User logged in: ${email}`);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    authErrorCounter.inc({ type: 'server_error' });
    console.error('[ERROR] /login:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[ERROR] /me:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[INFO] Auth service running on port ${PORT}`);
  console.log(`[INFO] Health: http://localhost:${PORT}/health`);
  console.log(`[INFO] Metrics: http://localhost:${PORT}/metrics`);
});