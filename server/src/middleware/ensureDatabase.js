const asyncHandler = require('../utils/asyncHandler');
const { connectDatabase } = require('../config/database');

module.exports = asyncHandler(async (_req, _res, next) => {
  await connectDatabase();
  next();
});
