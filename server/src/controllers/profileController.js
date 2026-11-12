const ApiResponse = require('../utils/ApiResponse'); const asyncHandler = require('../utils/asyncHandler'); const { updateProfile, calculateProfileCompletion } = require('../services/profileService');
const getProfile = asyncHandler(async (req, res) => res.json(new ApiResponse({ message: 'Profile retrieved', data: { user: req.user } })));
const putProfile = asyncHandler(async (req, res) => { const user = await updateProfile(req.user, req.body); res.json(new ApiResponse({ message: 'Profile updated', data: { user } })); });
const completion = asyncHandler(async (req, res) => res.json(new ApiResponse({ message: 'Profile completion retrieved', data: { percentage: req.user.profileCompletionPercentage, calculatedPercentage: calculateProfileCompletion(req.user), completed: req.user.profileCompleted } })));
module.exports = { getProfile, putProfile, completion };
