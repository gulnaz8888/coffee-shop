const express = require("express");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/users");
const reservationRoutes = require("./routes/reservationRoutes");
const externalRoutes = require("./routes/externalRoutes");
const unsplashRoutes = require("./routes/unsplashRoutes");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes); 
app.use("/api/users", userRoutes);
app.use("/api/resource", reservationRoutes); 
app.use("/api/external", externalRoutes);
app.use("/api/unsplash", unsplashRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "auth.html"));
});

app.get("/reservations", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "reservations.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;