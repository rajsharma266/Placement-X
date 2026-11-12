const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

const createToken = (userId) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    throw new ApiError(500, 'Authentication is not configured');
  }
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

module.exports = { createToken };
