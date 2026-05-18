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
  .then(() => console.log('Product DB connected'))
  .catch((err) => console.error('DB error:', err.message));

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  inStock: { type: Boolean, default: true }
});
const Product = mongoose.model('Product', ProductSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = await Product.insertMany([
      { name: 'Espresso', price: 350, category: 'coffee' },
      { name: 'Latte', price: 450, category: 'coffee' },
      { name: 'Cappuccino', price: 450, category: 'coffee' },
      { name: 'Americano', price: 300, category: 'coffee' },
      { name: 'Croissant', price: 300, category: 'pastry' },
      { name: 'Chocolate Muffin', price: 350, category: 'pastry' },
      { name: 'Green Tea', price: 300, category: 'tea' },
      { name: 'Coffee Mug', price: 1200, category: 'merch' }
    ]);
    res.json({ message: 'Seeded!', count: products.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`Product service on port ${PORT}`));
