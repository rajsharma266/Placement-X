const test = require('node:test');
const assert = require('node:assert/strict');
const Assessment = require('../src/models/AptitudeAssessment');
const Attempt = require('../src/models/AptitudeAttempt');
const Activity = require('../src/models/Activity');
const snapshots = require('../src/services/readinessSnapshotService');
const service = require('../src/services/aptitudeAssessmentService');

const question = (selectedAnswer = null, markedForReview = false) => ({
  questionId: '507f1f77bcf86cd799439011', question: 'What is 12 × 3?', options: ['30', '36', '42'],
  correctAnswer: 1, explanation: 'Multiply 12 by 3.', category: 'quantitative', topic: 'Arithmetic',
  difficulty: 'easy', selectedAnswer, markedForReview,
});
const sample = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439012', user: '507f1f77bcf86cd799439013', status: 'active', __v: 0,
  startedAt: new Date(Date.now() - 60000), deadlineAt: new Date(Date.now() + 300000),
  durationMinutes: 5, category: 'quantitative', questions: [question()], ...overrides,
});

test('scoring uses saved answers, counts unanswered, and hides solutions until submitted', () => {
  const active = sample();
  const publicView = service.publicAssessment(active);
  assert.equal(JSON.stringify(publicView).includes('correctAnswer'), false);
  assert.equal(JSON.stringify(publicView).includes('explanation'), false);
  const result = service.scoreAssessment(sample({ questions: [question(1), { ...question(), questionId: '507f1f77bcf86cd799439014', selectedAnswer: 0 }, { ...question(), questionId: '507f1f77bcf86cd799439015' }] }), new Date());
  assert.deepEqual([result.correct, result.incorrect, result.unanswered, result.score, result.accuracy], [1, 1, 1, 33, 50]);
  assert.equal(result.review[0].correctAnswer, 1);
  assert.equal(result.review[0].explanation, 'Multiply 12 by 3.');
});

test('ownership, answer persistence, review flag, expiry, and duplicate submission', async () => {
  const original = { findOne: Assessment.findOne, findOneAndUpdate: Assessment.findOneAndUpdate, updateOne: Attempt.updateOne, createActivity: Activity.create, capture: snapshots.captureSnapshot };
  let stored = sample(); let writes = 0; let progressWrites = 0; let activities = 0;
  Assessment.findOne = (filter) => ({ lean: async () => filter.user === stored.user ? stored : null });
  Assessment.findOneAndUpdate = async (filter, update) => {
    if (filter.user !== stored.user || stored.status !== 'active') return null;
    if (filter.__v !== undefined && filter.__v !== stored.__v) return null;
    if (filter.deadlineAt && stored.deadlineAt <= filter.deadlineAt.$gt) return null;
    if (update.$set.status) stored = { ...stored, ...update.$set, __v: stored.__v + 1 };
    else {
      const q = { ...stored.questions[0] };
      for (const [key, value] of Object.entries(update.$set)) q[key.split('.').at(-1)] = value;
      stored = { ...stored, questions: [q], __v: stored.__v + 1 };
    }
    writes += 1; return stored;
  };
  Attempt.updateOne = async () => { progressWrites += 1; return { upsertedCount: 1 }; };
  Activity.create = async () => { activities += 1; return {}; };
  snapshots.captureSnapshot = async () => {};
  try {
    await assert.rejects(service.get('507f1f77bcf86cd799439099', stored._id), (error) => error.statusCode === 404);
    const answered = await service.save(stored.user, stored._id, { questionIndex: 0, selectedAnswer: 1 });
    assert.equal(answered.questions[0].selectedAnswer, 1);
    const marked = await service.save(stored.user, stored._id, { questionIndex: 0, markedForReview: true });
    assert.equal(marked.questions[0].selectedAnswer, 1);
    assert.equal(marked.questions[0].markedForReview, true);
    assert.equal(writes, 2);
    const submitted = await service.finalize(stored.user, stored._id);
    assert.equal(submitted.result.correct, 1);
    assert.equal(submitted.result.score, 100);
    assert.equal(activities, 1);
    const duplicate = await service.finalize(stored.user, stored._id);
    assert.deepEqual(duplicate.result, submitted.result);
    assert.equal(writes, 3);
    assert.equal(activities, 1);
    assert.equal(progressWrites, 2); // Upserts use the same assessment/question key.
    stored = sample({ deadlineAt: new Date(Date.now() - 1000) });
    const expired = await service.save(stored.user, stored._id, { questionIndex: 0, selectedAnswer: 1 });
    assert.equal(expired.status, 'submitted');
    assert.equal(expired.result.unanswered, 1);
  } finally {
    Assessment.findOne = original.findOne; Assessment.findOneAndUpdate = original.findOneAndUpdate;
    Attempt.updateOne = original.updateOne; Activity.create = original.createActivity;
    snapshots.captureSnapshot = original.capture;
  }
});

test('answers and review marks survive switching question indexes', async () => {
  const original = { findOne: Assessment.findOne, findOneAndUpdate: Assessment.findOneAndUpdate };
  let stored = sample({ questions: [question(), { ...question(), questionId: '507f1f77bcf86cd799439014', topic: 'Percentages' }] });
  Assessment.findOne = () => ({ lean: async () => stored });
  Assessment.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.user, stored.user);
    const next = stored.questions.map((item) => ({ ...item }));
    for (const [path, value] of Object.entries(update.$set)) {
      const [, index, field] = path.split('.'); next[Number(index)][field] = value;
    }
    stored = { ...stored, questions: next, __v: stored.__v + 1 };
    return stored;
  };
  try {
    await service.save(stored.user, stored._id, { questionIndex: 0, selectedAnswer: 1 });
    await service.save(stored.user, stored._id, { questionIndex: 1, selectedAnswer: 0, markedForReview: true });
    const revisited = await service.get(stored.user, stored._id);
    assert.equal(revisited.questions[0].selectedAnswer, 1);
    assert.equal(revisited.questions[1].selectedAnswer, 0);
    assert.equal(revisited.questions[1].markedForReview, true);
    assert.equal(JSON.stringify(revisited).includes('correctAnswer'), false);
  } finally { Assessment.findOne = original.findOne; Assessment.findOneAndUpdate = original.findOneAndUpdate; }
});
