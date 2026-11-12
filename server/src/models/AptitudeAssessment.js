const mongoose = require('mongoose');

const assessmentQuestionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: { type: String, default: '' },
  category: String,
  topic: String,
  difficulty: String,
  selectedAnswer: { type: Number, default: null },
  markedForReview: { type: Boolean, default: false },
}, { _id: false });

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'submitted'], default: 'active', index: true },
  category: { type: String, default: '' },
  durationMinutes: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, required: true },
  submittedAt: Date,
  questions: { type: [assessmentQuestionSchema], required: true },
  result: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

schema.index({ user: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('AptitudeAssessment', schema);
