const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  console.error("=== ERROR ===");
  console.error(req.method, req.originalUrl);
  console.error(err);
  console.error("=============");

  if (err && err.code === 11000) {
    return res.status(409).json({ message: "User exists" });
  }

  if (err && err.name === "ValidationError") {
    const msg = Object.values(err.errors).map(e => e.message).join("; ");
    return res.status(400).json({ message: msg });
  }

  res.status(statusCode).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };