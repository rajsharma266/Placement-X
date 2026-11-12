const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { connectDatabase } = require('../config/database');

const protect = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication is required');
  if (!process.env.JWT_SECRET) throw new ApiError(500, 'Authentication is not configured');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new ApiError(401, 'Invalid or expired authentication token'); }
  await connectDatabase();
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Authentication is required');
  req.user = user;
  next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You are not authorized to access this resource'));
  return next();
};

module.exports = { protect, authorize };
