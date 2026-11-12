const AptitudeQuestion = require('../models/AptitudeQuestion');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const { realQuestionFilter } = require('./aptitudeAssessmentService');
const { orderPracticeQuestions, recommendTopics } = require('./aptitudeInsights');

const buildFilter = (query = {}) => {
  const filter = { ...realQuestionFilter };
  for (const field of ['category', 'topic', 'difficulty']) {
    if (typeof query[field] === 'string' && query[field].trim()) filter[field] = query[field].trim();
  }
  if (typeof query.company === 'string' && query.company.trim()) filter.companyTags = query.company.trim();
  if (typeof query.search === 'string' && query.search.trim()) filter.$text = { $search: query.search.trim() };
  return filter;
};

const catalog = async (query, topicPerformance) => {
  const filter = buildFilter({ category: query.category, difficulty: query.difficulty });
  const rows = await AptitudeQuestion.aggregate([
    { $match: filter },
    { $group: { _id: { category: '$category', topic: '$topic', difficulty: '$difficulty' }, count: { $sum: 1 } } },
  ]);
  const topics = new Map(); const difficultyCounts = {}; let total = 0;
  rows.forEach((row) => {
    const { category, topic, difficulty } = row._id;
    const key = `${category}:${topic}`;
    if (!topics.has(key)) topics.set(key, { category, topic, available: 0 });
    topics.get(key).available += row.count;
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + row.count;
    total += row.count;
  });
  return { total, difficultyCounts, topics: [...topics.values()].sort((a, b) => a.category.localeCompare(b.category) || a.topic.localeCompare(b.topic)),
    recommendations: recommendTopics(topicPerformance, [...topics.values()]) };
};

const listQuestions = async (query, userId, { limit, skip }) => {
  const filter = buildFilter(query);
  const total = await AptitudeQuestion.countDocuments(filter);
  if (query.order !== 'adaptive') {
    const items = await AptitudeQuestion.find(filter).select('-correctAnswer -explanation').sort({ bankId: 1, _id: 1 }).skip(skip).limit(limit).lean();
    return { items, total };
  }
  const items = await AptitudeQuestion.find(filter).select('-correctAnswer -explanation').lean();
  const recent = await AptitudeAttempt.find({ user: userId, question: { $in: items.map((item) => item._id) } })
    .sort({ createdAt: -1, _id: -1 }).limit(5000).select('question isCorrect revisionRequired createdAt').lean();
  return { items: orderPracticeQuestions(items, recent).slice(skip, skip + limit), total };
};

module.exports = { buildFilter, catalog, listQuestions };
