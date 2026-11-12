const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { registerUser, loginUser } = require('../services/authService');

const validateCredentials = ({ fullName, email, password }, requireName = false) => {
  if ((requireName && (!fullName || typeof fullName !== 'string')) || !email || !password) throw new ApiError(400, 'Full name, email, and password are required');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new ApiError(400, 'Please provide a valid email address');
  if (typeof password !== 'string' || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters long');
};

const sendAuthResponse = (res, statusCode, message, { user, token }) => res.status(statusCode).json(new ApiResponse({ statusCode, message, data: { user, token } }));

const register = asyncHandler(async (req, res) => { validateCredentials(req.body, true); sendAuthResponse(res, 201, 'Account created successfully', await registerUser(req.body)); });
const login = asyncHandler(async (req, res) => { validateCredentials(req.body); sendAuthResponse(res, 200, 'Signed in successfully', await loginUser(req.body)); });
const logout = (_req, res) => res.status(200).json(new ApiResponse({ message: 'Signed out successfully' }));
const me = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse({ message: 'Current user retrieved', data: { user: req.user } })));

module.exports = { register, login, logout, me };
