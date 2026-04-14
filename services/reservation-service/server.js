require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/coffeeshop');

const ReservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  dateTime: Date,
  guests: Number,
  notes: String
});
const Reservation = mongoose.model('Reservation', ReservationSchema);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reservation-service' });
});

app.post('/', auth, async (req, res) => {
  try {
    const reservation = await Reservation.create({ ...req.body, user: req.user.id });
    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/', auth, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/:id', auth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (r.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/:id', auth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (r.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    const updated = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/:id', auth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (r.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Reservation service running on port ${PORT}`));