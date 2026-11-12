const mongoose = require('mongoose');
const aptitudeQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 5000 }, options: { type: [String], required: true, validate: [(v) => v.length >= 2 && v.length <= 6, 'Provide 2 to 6 options'] },
  correctAnswer: { type: Number, required: true, min: 0 }, explanation: { type: String, default: '' }, topic: { type: String, required: true, trim: true, index: true },
  category: { type: String, enum: ['quantitative', 'logical-reasoning', 'verbal-ability'], required: true, index: true }, difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true }, estimatedTimeSeconds: { type: Number, min: 15, max: 600 }, bankId: { type: String, trim: true }, companyTags: { type: [String], default: [] }, isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
aptitudeQuestionSchema.path('correctAnswer').validate(function validIndex(v) { return v < this.options.length; }, 'Correct answer must be an option index');
aptitudeQuestionSchema.index({ question: 'text', topic: 'text' });
aptitudeQuestionSchema.index({ bankId: 1 }, { unique: true, partialFilterExpression: { bankId: { $type: 'string' } } });
module.exports = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
