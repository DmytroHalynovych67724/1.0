class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function sendError(res, status, code, message, details) {
  const payload = { error: message, code };
  if (details && details.length) payload.details = details;
  return res.status(status).json(payload);
}

module.exports = { AppError, asyncHandler, sendError };
