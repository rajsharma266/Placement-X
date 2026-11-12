const Interview = require('../models/Interview');
const InterviewQuestion = require('../models/InterviewQuestion');
const ApiError = require('../utils/ApiError');
const { recordActivity } = require('./activityService');
const ResumeAnalysis = require('../models/ResumeAnalysis'); const Company = require('../models/Company');

const createInterview = async (user, body) => {
  const { targetRole, interviewType, difficulty = 'medium', targetCompany = '' } = body || {};
  if (typeof targetRole !== 'string' || !targetRole.trim()) throw new ApiError(400, 'targetRole is required');
  if (!['HR', 'Technical', 'Mixed'].includes(interviewType)) throw new ApiError(400, 'interviewType must be HR, Technical, or Mixed');
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new ApiError(400, 'difficulty must be easy, medium, or hard');
  const typeFilter = interviewType === 'Mixed' ? { $in: ['HR', 'Technical', 'Mixed'] } : { $in: [interviewType, 'Mixed'] };
  const [latestResume, previous, company] = await Promise.all([ResumeAnalysis.findOne({ user: user._id }).sort({ createdAt: -1 }).select('detectedSkills').lean(), Interview.find({ user: user._id, status: 'completed' }).sort({ completedAt: -1 }).limit(5).select('recommendedTopics questions.category').lean(), targetCompany ? Company.findOne({ name: targetCompany, isActive: true }).select('name technicalTopics hrTopics').lean() : null]);
  let bank = await InterviewQuestion.find({ isActive: true, interviewType: typeFilter, targetRoles: targetRole.trim() }).lean();
  if (bank.length < 4) bank = await InterviewQuestion.find({ isActive: true, interviewType: typeFilter }).lean();
  if (!bank.length) throw new ApiError(503, 'Interview question bank is unavailable');
  const weak = new Set(previous.flatMap((item) => item.recommendedTopics || [])); const resumeSkills = new Set(latestResume?.detectedSkills || []); const companyTopics = new Set([...(company?.technicalTopics || []), ...(company?.hrTopics || [])].map((x) => x.toLowerCase())); const asked = new Set(previous.flatMap((item) => item.questions || []).map((q) => q.questionBankId?.toString()));
  bank = bank.sort((a, b) => { const weight = (q) => (q.difficulty === difficulty ? 3 : 0) + (weak.has(q.category) ? 4 : 0) + q.keywords.filter((x) => resumeSkills.has(x)).length * 2 + q.keywords.filter((x) => companyTopics.has(x.toLowerCase())).length * 2 - (asked.has(q._id.toString()) ? 3 : 0); return weight(b) - weight(a) || a.prompt.localeCompare(b.prompt); });
  const questions = bank.slice(0, 5).map((q) => ({ questionBankId: q._id, prompt: q.prompt, keywords: q.keywords, category: q.category }));
  return Interview.create({ user: user._id, targetRole: targetRole.trim(), targetCompany: company?.name || '', interviewType, difficulty, questions });
};

const findActiveInterview = async (userId, id) => {
  const interview = await Interview.findOne({ _id: id, user: userId });
  if (!interview) throw new ApiError(404, 'Interview not found');
  if (interview.status !== 'in-progress') throw new ApiError(409, 'Interview has already been completed');
  return interview;
};

const submitAnswers = async (userId, id, answers) => {
  if (!Array.isArray(answers) || !answers.length) throw new ApiError(400, 'Provide at least one interview answer');
  const interview = await findActiveInterview(userId, id);
  answers.forEach((answer) => {
    if (!answer || typeof answer.questionId !== 'string' || typeof answer.text !== 'string' || !answer.text.trim()) throw new ApiError(400, 'Each answer requires a questionId and non-empty text');
    const question = interview.questions.id(answer.questionId);
    if (!question) throw new ApiError(400, 'Answer references a question outside this interview');
    question.answer = { text: answer.text.trim().slice(0, 10000), submittedAt: new Date() };
  });
  await interview.save();
  return interview;
};

const includes = (text, term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|\\W)${escaped}(?=$|\\W)`, 'i').test(text);
};
const evaluate = (question) => {
  const text = question.answer?.text || '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  const matches = question.keywords.filter((word) => includes(text, word));
  const relevance = question.keywords.length ? Math.round(matches.length / question.keywords.length * 100) : 50;
  const completeness = Math.min(100, Math.round(words.length / 70 * 100)); const structure = /\b(first|then|finally|because|result|situation|action)\b/i.test(text) ? 80 : 40; const specificity = /\b(example|project|implemented|metric|%|users?)\b/i.test(text) ? 80 : 40;
  const score = Math.round((relevance * .45) + (completeness * .25) + (structure * .15) + (specificity * .15));
  return { score: Math.max(0, Math.min(100, score)), dimensions: { relevance, completeness, structure, specificity, technicalKeywordCoverage: relevance }, strengths: matches.length ? [`Covered expected concepts: ${matches.join(', ')}`] : [], missedConcepts: question.keywords.filter((word) => !matches.includes(word)), suggestions: [words.length < 30 ? 'Add enough detail to explain your approach.' : '', !/\b(example|project|result)\b/i.test(text) ? 'Include a concrete example or result where appropriate.' : ''].filter(Boolean) };
};

const completeInterview = async (userId, id) => {
  const interview = await findActiveInterview(userId, id);
  interview.questions.forEach((q) => { q.feedback = evaluate(q); });
  const scores = interview.questions.map((q) => q.feedback.score);
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const technical = interview.questions.filter((q) => q.keywords.length > 2).map((q) => q.feedback.score);
  const communication = interview.questions.map((q) => Math.min(100, Math.round(((q.answer?.text || '').split(/\s+/).filter(Boolean).length / 80) * 100)));
  interview.technicalScore = technical.length ? Math.round(technical.reduce((a, b) => a + b, 0) / technical.length) : overall;
  interview.communicationScore = Math.round(communication.reduce((a, b) => a + b, 0) / communication.length);
  interview.overallScore = overall;
  const feedback = interview.questions.map((q) => q.feedback); interview.dimensionScores = ['relevance', 'completeness', 'structure', 'specificity'].reduce((result, key) => ({ ...result, [key]: Math.round(feedback.reduce((sum, item) => sum + item.dimensions[key], 0) / feedback.length) }), {});
  interview.strengths = overall >= 70 ? ['Consistent coverage of expected interview topics'] : [];
  interview.weaknesses = interview.questions.filter((q) => q.feedback.score < 60).map((q) => q.prompt).slice(0, 3);
  interview.suggestions = overall < 70 ? ['Practice structured STAR responses and include concrete examples.'] : ['Maintain this level of specificity in future interviews.'];
  interview.recommendedTopics = interview.questions.filter((q) => q.feedback.score < 60).map((q) => q.category || q.keywords[0]).filter(Boolean).slice(0, 3); interview.nextBestAction = interview.recommendedTopics[0] ? { title: `Practice ${interview.recommendedTopics[0]} interview concepts`, route: '/interviews', reason: 'This topic had the lowest deterministic answer evidence.' } : { title: 'Take a harder technical mock', route: '/interviews', reason: 'Your answers covered the expected concepts.' };
  interview.status = 'completed';
  interview.completedAt = new Date();
  await interview.save();
  await recordActivity(userId, 'interview-completed', 'Completed mock interview', { interviewId: interview._id, score: overall });
  return interview;
};

module.exports = { createInterview, submitAnswers, completeInterview, evaluate };
