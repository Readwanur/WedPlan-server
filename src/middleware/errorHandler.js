/**
 * 404 Not Found Handler for unmatched API routes
 */
export function notFoundHandler(req, res) {
  return res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global Express Error Handling Middleware
 */
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
  console.error("Unhandled Express error:", err);
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    ok: false,
    error: err.message || "An unexpected server error occurred.",
  });
}
