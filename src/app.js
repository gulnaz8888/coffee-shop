const express = require("express");
const morgan = require("morgan");
const path = require("path");

const healthRoutes = require("./routes/health");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api", healthRoutes);

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  return res.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;