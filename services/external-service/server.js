require('dotenv').config();
const express = require('express');
const axios = require('axios');
const client = require('prom-client');
const winston = require('winston');

const requiredEnvVars = ['UNSPLASH_ACCESS_KEY'];
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
        new winston.transports.File({ filename: '/var/log/external-service.log' })
    ]
});

const app = express();
app.use(express.json());

client.collectDefaultMetrics();

const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});

const externalApiCalls = new client.Counter({
    name: 'external_api_calls_total',
    help: 'Total number of external API calls',
    labelNames: ['api', 'status']
});

const externalApiDuration = new client.Histogram({
    name: 'external_api_duration_ms',
    help: 'Duration of external API calls in ms',
    labelNames: ['api'],
    buckets: [100, 200, 500, 1000, 2000, 5000, 10000]
});

const serviceErrors = new client.Counter({
    name: 'service_errors_total',
    help: 'Total number of service errors',
    labelNames: ['type']
});

const serviceHealth = new client.Gauge({
    name: 'service_health_status',
    help: 'Health status of external dependencies (1=healthy, 0=unhealthy)',
    labelNames: ['dependency']
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        httpRequestDurationMicroseconds.labels(req.method, req.route ? req.route.path : req.path, res.statusCode).observe(duration);
    });
    next();
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'ok',
        service: 'external-service',
        dependencies: {
            weatherApi: false,
            unsplashApi: false
        },
        timestamp: new Date().toISOString()
    };

    try {
        const weatherCheck = await axios.get('https://wttr.in/Almaty?format=j1', { timeout: 5000 });
        healthStatus.dependencies.weatherApi = weatherCheck.status === 200;
        serviceHealth.labels('weather_api').set(healthStatus.dependencies.weatherApi ? 1 : 0);
    } catch (err) {
        healthStatus.dependencies.weatherApi = false;
        serviceHealth.labels('weather_api').set(0);
        logger.error({ msg: 'Weather API health check failed', error: err.message });
    }

    try {
        const unsplashCheck = await axios.get('https://api.unsplash.com/photos/random', {
            params: { count: 1 },
            headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
            timeout: 5000
        });
        healthStatus.dependencies.unsplashApi = unsplashCheck.status === 200;
        serviceHealth.labels('unsplash_api').set(healthStatus.dependencies.unsplashApi ? 1 : 0);
    } catch (err) {
        healthStatus.dependencies.unsplashApi = false;
        serviceHealth.labels('unsplash_api').set(0);
        logger.error({ msg: 'Unsplash API health check failed', error: err.message });
    }

    if (!healthStatus.dependencies.weatherApi || !healthStatus.dependencies.unsplashApi) {
        healthStatus.status = 'degraded';
        res.status(503);
    } else {
        res.status(200);
    }

    res.json(healthStatus);
});

app.get('/weather', async (req, res) => {
    const startTime = Date.now();
    logger.info({ msg: 'Weather API called', ip: req.ip });

    try {
        const response = await axios.get('https://wttr.in/Almaty?format=j1', { timeout: 10000 });
        const duration = Date.now() - startTime;
        
        externalApiCalls.labels('weather', 'success').inc();
        externalApiDuration.labels('weather').observe(duration);
        
        logger.info({ msg: 'Weather API success', duration_ms: duration });
        res.json(response.data);
    } catch (err) {
        const duration = Date.now() - startTime;
        externalApiCalls.labels('weather', 'error').inc();
        externalApiDuration.labels('weather').observe(duration);
        serviceErrors.labels('weather_api_failure').inc();
        
        logger.error({ msg: 'Weather API failed', error: err.message, duration_ms: duration });
        res.status(500).json({ 
            error: 'Unable to fetch weather data',
            message: err.message 
        });
    }
});

app.get('/unsplash/random', async (req, res) => {
    const startTime = Date.now();
    const { query = 'coffee', count = 6 } = req.query;
    
    logger.info({ msg: 'Unsplash API called', query, count, ip: req.ip });

    try {
        const response = await axios.get('https://api.unsplash.com/photos/random', {
            params: { query, count },
            headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
            timeout: 10000
        });
        
        const duration = Date.now() - startTime;
        externalApiCalls.labels('unsplash', 'success').inc();
        externalApiDuration.labels('unsplash').observe(duration);
        
        logger.info({ msg: 'Unsplash API success', duration_ms: duration, result_count: response.data.length });
        res.json(response.data);
    } catch (err) {
        const duration = Date.now() - startTime;
        externalApiCalls.labels('unsplash', 'error').inc();
        externalApiDuration.labels('unsplash').observe(duration);
        serviceErrors.labels('unsplash_api_failure').inc();
        
        logger.error({ msg: 'Unsplash API failed', error: err.message, duration_ms: duration });
        res.status(500).json({ 
            error: 'Unable to fetch images',
            message: err.message 
        });
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`External service running on port ${PORT}`);
    logger.info({ msg: 'Service started', port: PORT, env: process.env.NODE_ENV || 'development' });
});