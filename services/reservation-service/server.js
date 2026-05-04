require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const client = require('prom-client');
const winston = require('winston');

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: '/var/log/reservation-service.log' })
    ]
});

const app = express();
app.use(express.json());

client.collectDefaultMetrics();


const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});


const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});

const dbOperations = new client.Histogram({
    name: 'db_operation_duration_ms',
    help: 'Duration of database operations in ms',
    labelNames: ['operation', 'collection'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000]
});

const dbErrors = new client.Counter({
    name: 'db_errors_total',
    help: 'Total number of database errors',
    labelNames: ['operation']
});

const authFailures = new client.Counter({
    name: 'auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['reason']
});

const activeReservations = new client.Gauge({
    name: 'active_reservations_total',
    help: 'Total number of active reservations in database'
});

const mongooseConnectionState = new client.Gauge({
    name: 'mongoose_connection_state',
    help: 'Mongoose connection state (0=disconnected,1=connected,2=connecting,3=disconnecting)'
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route ? req.route.path : req.path;
        
   
        httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
        
      
        httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode).observe(duration);
    });
    next();
});


const mongoURI = process.env.MONGO_URI || 'mongodb://mongo:27017/coffeeshop';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
});

const db = mongoose.connection;

db.on('connected', () => {
    logger.info({ msg: 'MongoDB connected', uri: mongoURI });
    mongooseConnectionState.set(1);
});

db.on('error', (err) => {
    logger.error({ msg: 'MongoDB connection error', error: err.message });
    mongooseConnectionState.set(0);
    dbErrors.labels('connection').inc();
});

db.on('disconnected', () => {
    logger.warn({ msg: 'MongoDB disconnected' });
    mongooseConnectionState.set(0);
});

const ReservationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    dateTime: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1, max: 20 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    createdAt: { type: Date, default: Date.now }
});

ReservationSchema.index({ user: 1, dateTime: 1 });
ReservationSchema.index({ dateTime: 1 });

const Reservation = mongoose.model('Reservation', ReservationSchema);

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        authFailures.labels('missing_token').inc();
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        logger.debug({ msg: 'User authenticated', userId: req.user.id });
        next();
    } catch (err) {
        authFailures.labels('invalid_token').inc();
        logger.warn({ msg: 'Invalid token', error: err.message });
        res.status(401).json({ message: 'Invalid token' });
    }
};

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'ok',
        service: 'reservation-service',
        database: {
            state: mongoose.connection.readyState,
            stateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
        },
        timestamp: new Date().toISOString()
    };

    if (mongoose.connection.readyState !== 1) {
        healthStatus.status = 'unhealthy';
        res.status(503);
    } else {
        res.status(200);
    }

    res.json(healthStatus);
});

const updateActiveReservationsMetric = async () => {
    try {
        const count = await Reservation.countDocuments({ status: 'confirmed' });
        activeReservations.set(count);
    } catch (err) {
        logger.error({ msg: 'Failed to update active reservations metric', error: err.message });
    }
};

app.post('/', auth, async (req, res) => {
    const startTime = Date.now();
    const { title, dateTime, guests, notes } = req.body;

    if (!title || !dateTime || !guests) {
        return res.status(400).json({ message: 'Missing required fields: title, dateTime, guests' });
    }

    if (guests < 1 || guests > 20) {
        return res.status(400).json({ message: 'Guests must be between 1 and 20' });
    }

    try {
        const reservation = await Reservation.create({
            user: req.user.id,
            title,
            dateTime,
            guests,
            notes: notes || ''
        });

        const duration = Date.now() - startTime;
        dbOperations.labels('create', 'reservations').observe(duration);
        
        await updateActiveReservationsMetric();
        
        logger.info({ msg: 'Reservation created', reservationId: reservation._id, userId: req.user.id, guests });
        res.status(201).json(reservation);
    } catch (err) {
        const duration = Date.now() - startTime;
        dbOperations.labels('create', 'reservations').observe(duration);
        dbErrors.labels('create').inc();
        
        logger.error({ msg: 'Failed to create reservation', error: err.message, userId: req.user.id });
        res.status(500).json({ message: err.message });
    }
});

app.get('/', auth, async (req, res) => {
    const startTime = Date.now();
    const { limit = 50, offset = 0, status } = req.query;

    try {
        const query = { user: req.user.id };
        if (status) query.status = status;

        const reservations = await Reservation.find(query)
            .sort({ dateTime: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await Reservation.countDocuments(query);

        const duration = Date.now() - startTime;
        dbOperations.labels('find', 'reservations').observe(duration);

        logger.info({ msg: 'Reservations retrieved', userId: req.user.id, count: reservations.length, total });
        res.json({ reservations, total, offset: parseInt(offset), limit: parseInt(limit) });
    } catch (err) {
        const duration = Date.now() - startTime;
        dbOperations.labels('find', 'reservations').observe(duration);
        dbErrors.labels('find').inc();

        logger.error({ msg: 'Failed to retrieve reservations', error: err.message, userId: req.user.id });
        res.status(500).json({ message: err.message });
    }
});

app.get('/:id', auth, async (req, res) => {
    const startTime = Date.now();

    try {
        const reservation = await Reservation.findById(req.params.id);
        
        const duration = Date.now() - startTime;
        dbOperations.labels('findOne', 'reservations').observe(duration);

        if (!reservation) {
            logger.warn({ msg: 'Reservation not found', reservationId: req.params.id });
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (reservation.user.toString() !== req.user.id) {
            logger.warn({ msg: 'Unauthorized access attempt', reservationId: req.params.id, userId: req.user.id });
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json(reservation);
    } catch (err) {
        const duration = Date.now() - startTime;
        dbOperations.labels('findOne', 'reservations').observe(duration);
        dbErrors.labels('findOne').inc();

        logger.error({ msg: 'Failed to retrieve reservation', error: err.message, reservationId: req.params.id });
        res.status(500).json({ message: err.message });
    }
});

app.put('/:id', auth, async (req, res) => {
    const startTime = Date.now();
    const updates = req.body;

    if (updates.guests && (updates.guests < 1 || updates.guests > 20)) {
        return res.status(400).json({ message: 'Guests must be between 1 and 20' });
    }

    try {
        const reservation = await Reservation.findById(req.params.id);
        
        if (!reservation) {
            logger.warn({ msg: 'Reservation not found for update', reservationId: req.params.id });
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (reservation.user.toString() !== req.user.id) {
            logger.warn({ msg: 'Unauthorized update attempt', reservationId: req.params.id, userId: req.user.id });
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = await Reservation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        
        const duration = Date.now() - startTime;
        dbOperations.labels('update', 'reservations').observe(duration);

        await updateActiveReservationsMetric();

        logger.info({ msg: 'Reservation updated', reservationId: req.params.id, userId: req.user.id });
        res.json(updated);
    } catch (err) {
        const duration = Date.now() - startTime;
        dbOperations.labels('update', 'reservations').observe(duration);
        dbErrors.labels('update').inc();

        logger.error({ msg: 'Failed to update reservation', error: err.message, reservationId: req.params.id });
        res.status(500).json({ message: err.message });
    }
});

app.delete('/:id', auth, async (req, res) => {
    const startTime = Date.now();

    try {
        const reservation = await Reservation.findById(req.params.id);
        
        if (!reservation) {
            logger.warn({ msg: 'Reservation not found for deletion', reservationId: req.params.id });
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (reservation.user.toString() !== req.user.id) {
            logger.warn({ msg: 'Unauthorized deletion attempt', reservationId: req.params.id, userId: req.user.id });
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Reservation.findByIdAndDelete(req.params.id);
        
        const duration = Date.now() - startTime;
        dbOperations.labels('delete', 'reservations').observe(duration);

        await updateActiveReservationsMetric();

        logger.info({ msg: 'Reservation deleted', reservationId: req.params.id, userId: req.user.id });
        res.json({ message: 'Reservation deleted successfully' });
    } catch (err) {
        const duration = Date.now() - startTime;
        dbOperations.labels('delete', 'reservations').observe(duration);
        dbErrors.labels('delete').inc();

        logger.error({ msg: 'Failed to delete reservation', error: err.message, reservationId: req.params.id });
        res.status(500).json({ message: err.message });
    }
});

setInterval(updateActiveReservationsMetric, 60000);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Reservation service running on port ${PORT}`);
    logger.info({ msg: 'Service started', port: PORT, env: process.env.NODE_ENV || 'development' });
});

process.on('SIGINT', async () => {
    logger.info({ msg: 'Shutting down gracefully' });
    await mongoose.disconnect();
    process.exit(0);
});