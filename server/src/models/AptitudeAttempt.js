const mongoose = require('mongoose');
const aptitudeAttemptSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, question: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true }, assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeAssessment' }, selectedAnswer: { type: Number, required: true, min: 0 }, isCorrect: { type: Boolean, required: true }, revisionRequired: { type: Boolean, default: false }, category: String, topic: String }, { timestamps: true });
aptitudeAttemptSchema.index({ user: 1, question: 1, createdAt: -1 });
aptitudeAttemptSchema.index({ assessment: 1, question: 1 }, { unique: true, partialFilterExpression: { assessment: { $exists: true } } });
module.exports = mongoose.model('AptitudeAttempt', aptitudeAttemptSchema);
