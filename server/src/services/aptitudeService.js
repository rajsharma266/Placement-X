const AptitudeQuestion = require('../models/AptitudeQuestion'); const AptitudeAttempt = require('../models/AptitudeAttempt'); const ApiError = require('../utils/ApiError'); const { recordActivity } = require('./activityService'); const { realQuestionFilter } = require('./aptitudeAssessmentService'); const { summarizeProgress } = require('./aptitudeInsights');
const submitAttempt = async (user, questionId, selectedAnswer) => { const question = await AptitudeQuestion.findOne({ _id: questionId, ...realQuestionFilter }); if (!question) throw new ApiError(404, 'Aptitude question not found'); if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= question.options.length) throw new ApiError(400, 'Selected answer is invalid'); const isCorrect = selectedAnswer === question.correctAnswer; const attempt = await AptitudeAttempt.create({ user: user._id, question: question._id, selectedAnswer, isCorrect, category: question.category, topic: question.topic }); await recordActivity(user._id, 'aptitude-attempt', `Attempted ${question.category} question`, { questionId, isCorrect }); return { attempt, isCorrect, explanation: question.explanation, correctAnswer: question.correctAnswer }; };
const progress = async (userId) => { const rows = await AptitudeAttempt.aggregate([
  { $match: { user: userId } },
  { $lookup: { from: 'aptitudequestions', localField: 'question', foreignField: '_id', as: 'sourceQuestion' } },
  { $unwind: '$sourceQuestion' },
  { $match: { 'sourceQuestion.question': { $not: /^Development demo:/i }, 'sourceQuestion.options': { $nin: ['Option A', 'Option B', 'Option C', 'Option D'] } } },
  { $group: { _id: { category: '$category', topic: '$topic' }, attempted: { $sum: 1 }, correct: { $sum: { $cond: ['$isCorrect', 1, 0] } } } },
]); return summarizeProgress(rows); };
const setRevision = async (userId, attemptId, revisionRequired) => {
  if (typeof revisionRequired !== 'boolean') throw new ApiError(400, 'revisionRequired must be a boolean');
  const attempt = await AptitudeAttempt.findOneAndUpdate({ _id: attemptId, user: userId }, { $set: { revisionRequired } }, { new: true });
  if (!attempt) throw new ApiError(404, 'Aptitude attempt not found');
  return { _id: attempt._id, revisionRequired: attempt.revisionRequired };
};
module.exports = { submitAttempt, progress, setRevision };
