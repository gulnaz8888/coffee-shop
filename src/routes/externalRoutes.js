const express = require("express");
const { getWeather, getPhotos } = require("../controllers/externalController");

const router = express.Router();
router.get("/weather", getWeather);
router.get("/photos", getPhotos);

module.exports = router;