const AptitudeAssessment = require('../models/AptitudeAssessment');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const AptitudeQuestion = require('../models/AptitudeQuestion');
const ApiError = require('../utils/ApiError');
const { recordActivity } = require('./activityService');

const categories = ['quantitative', 'logical-reasoning', 'verbal-ability'];
const realQuestionFilter = {
  isActive: true,
  question: { $not: /^Development demo:/i },
  options: { $nin: ['Option A', 'Option B', 'Option C', 'Option D'] },
};

const publicAssessment = (assessment) => ({
  _id: assessment._id,
  status: assessment.status,
  category: assessment.category,
  durationMinutes: assessment.durationMinutes,
  startedAt: assessment.startedAt,
  deadlineAt: assessment.deadlineAt,
  submittedAt: assessment.submittedAt,
  questions: assessment.questions.map((item) => ({
    questionId: item.questionId, question: item.question, options: item.options,
    category: item.category, topic: item.topic, difficulty: item.difficulty,
    selectedAnswer: item.selectedAnswer, markedForReview: item.markedForReview,
  })),
  ...(assessment.status === 'submitted' ? { result: assessment.result } : {}),
});

const scoreAssessment = (assessment, submittedAt) => {
  const questions = assessment.questions;
  const answered = questions.filter((item) => item.selectedAnswer !== null).length;
  const correct = questions.filter((item) => item.selectedAnswer === item.correctAnswer).length;
  const topics = {};
  questions.forEach((item) => {
    const topic = item.topic || 'Other';
    if (!topics[topic]) topics[topic] = { topic, total: 0, answered: 0, correct: 0 };
    topics[topic].total += 1;
    if (item.selectedAnswer !== null) topics[topic].answered += 1;
    if (item.selectedAnswer === item.correctAnswer) topics[topic].correct += 1;
  });
  return {
    total: questions.length, correct, incorrect: answered - correct,
    unanswered: questions.length - answered,
    score: Math.round(correct / questions.length * 100),
    accuracy: answered ? Math.round(correct / answered * 100) : 0,
    timeUsedSeconds: Math.max(0, Math.round((Math.min(submittedAt.getTime(), new Date(assessment.deadlineAt).getTime()) - new Date(assessment.startedAt).getTime()) / 1000)),
    topicPerformance: Object.values(topics).map((item) => ({ ...item, accuracy: item.answered ? Math.round(item.correct / item.answered * 100) : 0 })),
    review: questions.map((item) => ({
      questionId: item.questionId, question: item.question, options: item.options,
      topic: item.topic, difficulty: item.difficulty, selectedAnswer: item.selectedAnswer,
      correctAnswer: item.correctAnswer, explanation: item.explanation,
      isCorrect: item.selectedAnswer !== null && item.selectedAnswer === item.correctAnswer,
    })),
  };
};

const getOwned = async (userId, id) => {
  const assessment = await AptitudeAssessment.findOne({ _id: id, user: userId }).lean();
  if (!assessment) throw new ApiError(404, 'Assessment not found');
  return assessment;
};

const syncProgress = async (assessment) => {
  const answered = assessment.questions.filter((item) => item.selectedAnswer !== null);
  await Promise.all(answered.map((item) => AptitudeAttempt.updateOne(
    { assessment: assessment._id, question: item.questionId },
    { $setOnInsert: { user: assessment.user, assessment: assessment._id, question: item.questionId,
      selectedAnswer: item.selectedAnswer, isCorrect: item.selectedAnswer === item.correctAnswer,
      category: item.category, topic: item.topic } },
    { upsert: true },
  ).catch((error) => { if (error.code !== 11000) throw error; })));
};

const finalize = async (userId, id) => {
  for (let retry = 0; retry < 6; retry += 1) {
    const current = await getOwned(userId, id);
    if (current.status === 'submitted') { await syncProgress(current); return publicAssessment(current); }
    const submittedAt = new Date();
    const result = scoreAssessment(current, submittedAt);
    const updated = await AptitudeAssessment.findOneAndUpdate(
      { _id: id, user: userId, status: 'active', __v: current.__v },
      { $set: { status: 'submitted', submittedAt, result }, $inc: { __v: 1 } },
      { new: true, lean: true },
    );
    if (updated) {
      await syncProgress(updated);
      await recordActivity(userId, 'aptitude-attempt', 'Completed timed aptitude assessment', { assessmentId: id, score: result.score });
      return publicAssessment(updated);
    }
  }
  throw new ApiError(409, 'Assessment changed. Please try submitting again.');
};

const start = async (userId, { category = '', difficulty = '', questionCount, durationMinutes }) => {
  if (category && !categories.includes(category)) throw new ApiError(400, 'Invalid category');
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) throw new ApiError(400, 'Invalid difficulty');
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30) throw new ApiError(400, 'Question count must be between 1 and 30');
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 90) throw new ApiError(400, 'Duration must be between 5 and 90 minutes');
  const existing = await AptitudeAssessment.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 }).lean();
  if (existing) {
    if (new Date(existing.deadlineAt) <= new Date()) await finalize(userId, existing._id);
    else return publicAssessment(existing);
  }
  const filter = { ...realQuestionFilter, ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}) };
  const available = await AptitudeQuestion.countDocuments(filter);
  if (available < questionCount) throw new ApiError(400, `Only ${available} assessment questions are available for these filters`);
  const questions = await AptitudeQuestion.aggregate([{ $match: filter }, { $sample: { size: questionCount } }]);
  const startedAt = new Date();
  const assessment = await AptitudeAssessment.create({
    user: userId, category, durationMinutes, startedAt,
    deadlineAt: new Date(startedAt.getTime() + durationMinutes * 60000),
    questions: questions.map((item) => ({ questionId: item._id, question: item.question, options: item.options,
      correctAnswer: item.correctAnswer, explanation: item.explanation, category: item.category,
      topic: item.topic, difficulty: item.difficulty })),
  });
  return publicAssessment(assessment);
};

const active = async (userId) => {
  const assessment = await AptitudeAssessment.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 }).lean();
  if (!assessment) return null;
  if (new Date(assessment.deadlineAt) <= new Date()) return finalize(userId, assessment._id);
  return publicAssessment(assessment);
};

const get = async (userId, id) => {
  const assessment = await getOwned(userId, id);
  if (assessment.status === 'active' && new Date(assessment.deadlineAt) <= new Date()) return finalize(userId, id);
  if (assessment.status === 'submitted') await syncProgress(assessment);
  return publicAssessment(assessment);
};

const save = async (userId, id, { questionIndex, selectedAnswer, markedForReview }) => {
  const current = await getOwned(userId, id);
  if (current.status !== 'active') return publicAssessment(current);
  if (new Date(current.deadlineAt) <= new Date()) return finalize(userId, id);
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= current.questions.length) throw new ApiError(400, 'Invalid question index');
  if (selectedAnswer !== undefined && selectedAnswer !== null && (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= current.questions[questionIndex].options.length)) throw new ApiError(400, 'Invalid answer');
  if (markedForReview !== undefined && typeof markedForReview !== 'boolean') throw new ApiError(400, 'Invalid review flag');
  const values = {};
  if (selectedAnswer !== undefined) values[`questions.${questionIndex}.selectedAnswer`] = selectedAnswer;
  if (markedForReview !== undefined) values[`questions.${questionIndex}.markedForReview`] = markedForReview;
  if (!Object.keys(values).length) throw new ApiError(400, 'No changes provided');
  const updated = await AptitudeAssessment.findOneAndUpdate(
    { _id: id, user: userId, status: 'active', deadlineAt: { $gt: new Date() } },
    { $set: values, $inc: { __v: 1 } }, { new: true, lean: true },
  );
  if (!updated) return get(userId, id);
  return publicAssessment(updated);
};

module.exports = { realQuestionFilter, publicAssessment, scoreAssessment, start, active, get, save, finalize };
