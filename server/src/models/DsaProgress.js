const mongoose = require('mongoose');
const dsaProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, question: { type: mongoose.Schema.Types.ObjectId, ref: 'DsaQuestion', required: true },
  attempted: { type: Boolean, default: false }, solved: { type: Boolean, default: false }, bookmarked: { type: Boolean, default: false }, revisionRequired: { type: Boolean, default: false }, attemptsCount: { type: Number, default: 0, min: 0 }, lastAttemptedAt: Date, solvedAt: Date,
}, { timestamps: true });
dsaProgressSchema.index({ user: 1, question: 1 }, { unique: true }); dsaProgressSchema.index({ user: 1, solved: 1 });
module.exports = mongoose.model('DsaProgress', dsaProgressSchema);
