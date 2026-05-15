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
  .then(() => console.log('Product DB connected'));

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

app.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

const PORT = 3006;
app.listen(PORT, () => console.log(`Product service on port ${PORT}`));
