require('dotenv').config();
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

const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/coffeeshop';

mongoose.connect(mongoUri)
  .then(() => console.log('Payment DB connected'))
  .catch((err) => console.error('DB error:', err.message));

const PaymentSchema = new mongoose.Schema({
  orderId: String,
  userId: String,
  amount: Number,
  status: { type: String, default: 'pending' },
  method: String,
  createdAt: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', PaymentSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.post('/payments', async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/payments', async (req, res) => {
  const payments = await Payment.find();
  res.json(payments);
});

app.get('/payments/order/:orderId', async (req, res) => {
  const payments = await Payment.find({ orderId: req.params.orderId });
  res.json(payments);
});

app.put('/payments/:id/status', async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(payment);
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`Payment service on port ${PORT}`));
