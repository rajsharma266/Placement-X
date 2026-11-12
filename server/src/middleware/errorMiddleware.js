const errorMiddleware = (error, req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = error.keyPattern?.email ? 'An account with this email already exists' : 'A record with these unique fields already exists';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }
  if (error.code === 'LIMIT_FILE_SIZE') { statusCode = 413; message = 'Uploaded file exceeds the 4 MB limit'; }
  if (error.type === 'entity.parse.failed') { statusCode = 400; message = 'Malformed JSON request body'; }

  const response = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : message,
  };

  if (error.details) {
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
