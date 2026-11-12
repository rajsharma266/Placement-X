const test = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../src/questionBank');
const { validateBank } = require('../src/questionBank/validate');
const { seedBank, deactivateDemos } = require('../src/seeds/seedAptitudeBank');
const AptitudeQuestion = require('../src/models/AptitudeQuestion');
const AptitudeAttempt = require('../src/models/AptitudeAttempt');
const Company = require('../src/models/Company');
const DsaQuestion = require('../src/models/DsaQuestion');
const { readiness: companyReadiness } = require('../src/services/companyService');
const { buildFilter, catalog } = require('../src/services/aptitudePracticeService');
const { summarizeProgress, recommendTopics, orderPracticeQuestions } = require('../src/services/aptitudeInsights');
const { progress, setRevision } = require('../src/services/aptitudeService');

test('120 authored questions pass structural, placeholder and numeric checks and Mongoose validation', async () => {
  const report = validateBank();
  assert.equal(report.valid, true, report.issues.join('\n'));
  assert.equal(report.total, 120);
  assert.equal(report.arithmeticChecks, 38);
  assert.deepEqual(Object.values(report.distribution).map((row) => row.total), [50, 40, 30]);
  await Promise.all(bank.map((item) => new AptitudeQuestion(item).validate()));
  assert.ok(bank.every((item) => item.options.length === 4 && item.explanation.length >= 60));
});

test('validator catches bad options, answer keys, categories, duplicates and placeholders', () => {
  const broken = bank.map((item) => ({ ...item, options: [...item.options] }));
  broken[0].options[1] = broken[0].options[0];
  broken[1].correctAnswer = 4;
  broken[2].category = 'other';
  broken[3].question = broken[4].question;
  broken[5].explanation = 'Development demo explanation';
  const report = validateBank(broken);
  assert.equal(report.valid, false);
  for (const text of ['options must be unique', 'invalid correct answer', 'invalid category', 'duplicate question', 'placeholder text']) assert.ok(report.issues.some((issue) => issue.includes(text)), text);
});

test('stable-ID upsert is idempotent and retains all rows', async () => {
  const rows = new Map();
  const Model = {
    findOne: async (filter) => rows.has(filter.bankId) ? {
      set: (fields) => { rows.set(filter.bankId, fields); }, save: async () => {},
    } : null,
    create: async (fields) => { assert.equal(Object.hasOwn(fields, 'arithmetic'), false); rows.set(fields.bankId, fields); },
  };
  const first = await seedBank(Model);
  const second = await seedBank(Model);
  assert.deepEqual(first, { total: 120, inserted: 120, updated: 0 });
  assert.deepEqual(second, { total: 120, inserted: 0, updated: 120 });
  assert.equal(rows.size, 120);
});

test('demo deactivation targets exact placeholders and never deletes attempt records', async () => {
  let filter;
  const Model = { updateMany: async (query, update) => { filter = query; assert.deepEqual(update, { $set: { isActive: false } }); return { modifiedCount: 20 }; } };
  assert.equal(await deactivateDemos(Model), 20);
  assert.ok(filter.question.test('Development demo: percentages question'));
  assert.equal(filter.question.test('A real percentages question'), false);
  assert.deepEqual(filter.options, ['Option A', 'Option B', 'Option C', 'Option D']);
});

test('category, topic and difficulty filters retain real-content guard', () => {
  const filter = buildFilter({ category: 'quantitative', topic: 'Ratio', difficulty: 'hard' });
  assert.equal(filter.category, 'quantitative');
  assert.equal(filter.topic, 'Ratio');
  assert.equal(filter.difficulty, 'hard');
  assert.equal(filter.isActive, true);
  assert.ok(filter.question.$not.test('Development demo: ratio'));
  assert.ok(filter.options.$nin.includes('Option A'));
  const matches = bank.filter((item) => item.category === filter.category && item.topic === filter.topic && item.difficulty === filter.difficulty);
  assert.equal(matches.length, 1);
});

test('catalog reports available topic counts and deterministic recommendations', async () => {
  const original = AptitudeQuestion.aggregate;
  AptitudeQuestion.aggregate = async (pipeline) => {
    assert.equal(pipeline[0].$match.category, 'quantitative');
    return [{ _id: { category: 'quantitative', topic: 'Percentages', difficulty: 'easy' }, count: 8 }, { _id: { category: 'quantitative', topic: 'Ratio', difficulty: 'medium' }, count: 7 }];
  };
  try {
    const contents = await catalog({ category: 'quantitative' }, [{ category: 'quantitative', topic: 'Percentages', attempted: 5, accuracy: 40 }]);
    assert.equal(contents.total, 15);
    assert.equal(contents.topics[0].available, 8);
    assert.equal(contents.recommendations[0].topic, 'Percentages');
    assert.equal(contents.recommendations[1].status, 'needs-assessment');
  } finally { AptitudeQuestion.aggregate = original; }
});

test('adaptive insights need three attempts and prioritize weak evidence', () => {
  const rows = [
    { _id: { category: 'quantitative', topic: 'Percentages' }, attempted: 5, correct: 2 },
    { _id: { category: 'quantitative', topic: 'Ratio' }, attempted: 5, correct: 4 },
    { _id: { category: 'quantitative', topic: 'Probability' }, attempted: 2, correct: 0 },
  ];
  const progress = summarizeProgress(rows);
  assert.equal(progress.attempted, 12);
  assert.deepEqual(progress.weakTopics.map((item) => item.topic), ['Percentages']);
  assert.deepEqual(progress.needsAssessment.map((item) => item.topic), ['Probability']);
  const available = rows.map((row) => ({ ...row._id, available: 7 }));
  const first = recommendTopics(progress.topicPerformance, available);
  assert.deepEqual(first.map((item) => item.topic), ['Percentages', 'Probability', 'Ratio']);
  assert.deepEqual(first, recommendTopics(progress.topicPerformance, available));
});

test('revision and incorrect answers outrank unseen questions, except the most recent question', () => {
  const questions = ['a', 'b', 'c', 'd'].map((_id) => ({ _id, bankId: _id }));
  const recent = [{ question: 'a', isCorrect: false, revisionRequired: true }, { question: 'b', isCorrect: false }, { question: 'c', isCorrect: true }];
  assert.deepEqual(orderPracticeQuestions(questions, recent).map((item) => item._id), ['b', 'd', 'c', 'a']);
});

test('progress excludes historical demo answers while keeping real attempt analytics', async () => {
  const original = AptitudeAttempt.aggregate;
  AptitudeAttempt.aggregate = async (pipeline) => {
    assert.equal(pipeline[0].$match.user, 'student-id');
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'aptitudequestions'));
    assert.ok(pipeline.some((stage) => stage.$match?.['sourceQuestion.question']?.$not.test('Development demo: old question')));
    return [{ _id: { category: 'quantitative', topic: 'Ratio' }, attempted: 4, correct: 3 }];
  };
  try {
    const result = await progress('student-id');
    assert.equal(result.categoryPerformance.quantitative.accuracy, 75);
    assert.equal(result.topicPerformance[0].attempted, 4);
    assert.equal(result.improvementOpportunities.length, 0);
  } finally { AptitudeAttempt.aggregate = original; }
});

test('revision flag update is scoped to the attempt owner', async () => {
  const original = AptitudeAttempt.findOneAndUpdate;
  AptitudeAttempt.findOneAndUpdate = async (filter, change) => {
    assert.deepEqual(filter, { _id: 'attempt-id', user: 'student-id' });
    assert.deepEqual(change, { $set: { revisionRequired: true } });
    return { _id: 'attempt-id', revisionRequired: true };
  };
  try { assert.deepEqual(await setRevision('student-id', 'attempt-id', true), { _id: 'attempt-id', revisionRequired: true }); }
  finally { AptitudeAttempt.findOneAndUpdate = original; }
});

test('company intelligence uses real aptitude attempt evidence', async () => {
  const original = { company: Company.findOne, dsa: DsaQuestion.find, attempts: AptitudeAttempt.aggregate };
  Company.findOne = async () => ({ name: 'Campus Co', requiredSkills: [], dsaTopics: [], aptitudeTopics: ['Ratio'] });
  DsaQuestion.find = () => ({ select: () => ({ lean: async () => [] }) });
  AptitudeAttempt.aggregate = async (pipeline) => {
    assert.ok(pipeline.some((stage) => stage.$match?.['sourceQuestion.question']?.$not.test('Development demo: ratio')));
    return [{ topic: 'Ratio', isCorrect: true }, { topic: 'Ratio', isCorrect: false }];
  };
  try {
    const result = await companyReadiness({ slug: 'campus-co', student: { _id: 'student-id', skills: [] } });
    assert.equal(result.components.aptitude, 50);
  } finally { Company.findOne = original.company; DsaQuestion.find = original.dsa; AptitudeAttempt.aggregate = original.attempts; }
});
