function notFound(req, res, next) {
  return res.status(404).json({ message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = Number(err.status) || 500;
  return res.status(status).json({ message: err.message || "Server error" });
}

module.exports = { notFound, errorHandler };