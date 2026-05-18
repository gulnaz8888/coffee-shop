require('dotenv').config();
const express = require('express');
const client = require('prom-client');

const app = express();
client.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'external-service' });
});

app.get('/weather', (req, res) => {
  res.json({ temperature: 22, condition: 'sunny' });
});

app.get('/photos', (req, res) => {
  res.json([{ url: 'https://via.placeholder.com/400', description: 'Coffee' }]);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`External service running on port ${PORT}`));
