const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, type: { type: String, enum: ['profile-completed', 'dsa-solved', 'aptitude-attempt', 'resume-analyzed', 'interview-completed'], required: true }, description: { type: String, required: true }, metadata: { type: mongoose.Schema.Types.Mixed, default: {} } }, { timestamps: true });
activitySchema.index({ user: 1, createdAt: -1 }); module.exports = mongoose.model('Activity', activitySchema);
