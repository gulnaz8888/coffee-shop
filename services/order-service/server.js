const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');

const app = express();
app.use(express.json());
client.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

mongoose.connect('mongodb://mongo:27017/coffeeshop')
  .then(() => console.log('Order DB connected'));

const OrderSchema = new mongoose.Schema({
  userId: String,
  items: Array,
  total: Number,
  status: { type: String, default: 'pending' }
});
const Order = mongoose.model('Order', OrderSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.post('/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

const PORT = 3004;
app.listen(PORT, () => console.log(`Order service on port ${PORT}`));
