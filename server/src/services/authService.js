const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { createToken } = require('../utils/token');

const registerUser = async ({ fullName, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists');
  const user = await User.create({ fullName: fullName.trim(), email: normalizedEmail, password });
  return { user, token: createToken(user.id) };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'This account is inactive');
  user.lastLogin = new Date();
  await user.save();
  return { user, token: createToken(user.id) };
};

module.exports = { registerUser, loginUser };
