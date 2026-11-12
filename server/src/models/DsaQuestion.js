const mongoose = require('mongoose');
const dsaQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 }, slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  description: { type: String, required: true, maxlength: 20000 }, topic: { type: String, required: true, trim: true, index: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true }, tags: { type: [String], default: [] }, companyTags: { type: [String], default: [] },
  examples: { type: [{ input: String, output: String, explanation: String }], default: [] }, hints: { type: [String], default: [] }, solution: { type: String, default: '' }, externalPracticeUrl: { type: String, default: '' }, isActive: { type: Boolean, default: true, index: true },
  constraints: { type: [String], default: [] },
}, { timestamps: true });
dsaQuestionSchema.index({ title: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('DsaQuestion', dsaQuestionSchema);
