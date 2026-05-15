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
  .then(() => console.log('Notification DB connected'));

const NotifSchema = new mongoose.Schema({
  userId: String,
  message: String,
  read: { type: Boolean, default: false }
});
const Notification = mongoose.model('Notification', NotifSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.post('/notify', async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/notifications/:userId', async (req, res) => {
  const notifs = await Notification.find({ userId: req.params.userId });
  res.json(notifs);
});

const PORT = 3005;
app.listen(PORT, () => console.log(`Notification service on port ${PORT}`));
