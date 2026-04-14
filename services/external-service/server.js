require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'external-service' });
});

app.get('/weather', async (req, res) => {
  try {
    const response = await axios.get(
      `https://wttr.in/Almaty?format=j1`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/unsplash/random', async (req, res) => {
  try {
    const { query = 'coffee', count = 6 } = req.query;
    const response = await axios.get(
      `https://api.unsplash.com/photos/random`,
      {
        params: { query, count },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`External service running on port ${PORT}`));