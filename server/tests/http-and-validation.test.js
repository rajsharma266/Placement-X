const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');
const User = require('../src/models/User');
const AptitudeQuestion = require('../src/models/AptitudeQuestion');
const { analyzeText } = require('../src/services/resumeService');
const { evaluate } = require('../src/services/interviewService');
const { calculateProfileCompletion } = require('../src/services/profileService');
const { buildTasks, summary } = require('../src/services/plannerService');
const { buildRecommendations, targetCompanyReadiness } = require('../src/services/placementIntelligenceService');
const { calculateTrends, direction, materiallyChanged } = require('../src/services/readinessSnapshotService');

const request = (server, path, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const address = server.address();
  const req = http.request({ host: '127.0.0.1', port: address.port, path, method, headers }, (res) => {
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

test('health, unknown route, malformed JSON, and missing JWT use safe status responses', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const health = await request(server, '/api/v1/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.success, true);

  const missing = await request(server, '/api/v1/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.success, false);

  const malformed = await request(server, '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.message, 'Malformed JSON request body');

  const protectedRoute = await request(server, '/api/v1/profile');
  assert.equal(protectedRoute.status, 401);
  assert.equal(protectedRoute.body.message, 'Authentication is required');
});

test('user and aptitude schemas reject invalid input before database persistence', async () => {
  const user = new User({ fullName: 'A', email: 'invalid-email', password: 'short' });
  await assert.rejects(user.validate(), (userError) => {
    assert.ok(userError.errors.fullName);
    assert.ok(userError.errors.email);
    assert.ok(userError.errors.password);
    return true;
  });

  const question = new AptitudeQuestion({ question: 'Question', options: ['A', 'B'], correctAnswer: 2, topic: 'Topic', category: 'quantitative', difficulty: 'easy' });
  await assert.rejects(question.validate(), /Correct answer must be an option index/);
});

test('aptitude questions accept every valid zero-based answer index', async () => {
  for (const correctAnswer of [0, 1, 2, 3]) {
    const question = new AptitudeQuestion({ question: `Question ${correctAnswer}`, options: ['A', 'B', 'C', 'D'], correctAnswer, topic: 'Topic', category: 'quantitative', difficulty: 'easy' });
    await question.validate();
  }
});

test('resume analysis has a deterministic, content-only output structure', () => {
  const text = 'Jane Doe jane@example.com +91 9876543210 Education B.Tech College Skills JavaScript React Node.js Express MongoDB Projects Improved conversion by 20%.';
  const first = analyzeText(text, 'MERN Developer');
  const second = analyzeText(text, 'MERN Developer');
  assert.deepEqual(first, second);
  assert.equal(first.score, 77);
  assert.deepEqual(first.missingSkills, ['rest api', 'git', 'sql']);
  assert.equal(first.sections.projects, true);
  assert.equal(first.measurableImpact, true);
  assert.ok(first.roleCompatibility < 100);
});

test('resume intelligence rewards target-role evidence and keeps scores bounded', () => {
  const sparse = analyzeText('Jane jane@example.com Education B.Tech', 'MERN Developer');
  const strong = analyzeText('Jane jane@example.com +91 9876543210 Summary MERN developer Education B.Tech Skills JavaScript React Node.js Express MongoDB REST API Git SQL Projects Built API database dashboard and improved speed by 30%. Experience Developed web application.', 'MERN Developer');
  assert.ok(strong.roleCompatibility > sparse.roleCompatibility);
  assert.ok(strong.score > sparse.score);
  assert.equal(strong.missingSkills.length, 0);
  assert.ok(strong.score >= 0 && strong.score <= 100);
  assert.equal(strong.actionVerbsDetected, true);
});

test('interview feedback and profile completion are deterministic', () => {
  const feedback = evaluate({ keywords: ['jwt', 'authentication'], answer: { text: 'JWT authentication protects API routes with authorization.' } });
  assert.equal(feedback.score, 60);
  assert.deepEqual(feedback.strengths, ['Covered expected concepts: jwt, authentication']);

  const completed = calculateProfileCompletion({ fullName: 'Student', college: 'College', degree: 'B.Tech', branch: 'CSE', graduationYear: 2027, targetRole: 'Backend Developer', preferredProgrammingLanguage: 'JavaScript', skills: ['node.js'] });
  assert.equal(completed, 100);
  assert.equal(calculateProfileCompletion({ fullName: 'Student', skills: [] }), 13);
});

test('interview evaluation is bounded and rewards expected concepts with structured evidence', () => {
  const weak = evaluate({ keywords: ['jwt', 'expiration'], answer: { text: 'JWT is used.' } });
  const strong = evaluate({ keywords: ['jwt', 'expiration'], answer: { text: 'First, JWT authentication uses a signed token. In my project the server verifies the signature and expiration before returning the result.' } });
  assert.ok(weak.score >= 0 && weak.score <= 100);
  assert.ok(strong.score > weak.score);
  assert.deepEqual(weak.missedConcepts, ['expiration']);
  assert.deepEqual(strong, evaluate({ keywords: ['jwt', 'expiration'], answer: { text: 'First, JWT authentication uses a signed token. In my project the server verifies the signature and expiration before returning the result.' } }));
});

test('intelligence recommendations drive deterministic, time-bounded planner tasks', () => {
  const context = { user: { profileCompletionPercentage: 95 }, readiness: { categoryScores: { dsa: { available: true, score: 82 }, aptitude: { available: true, score: 48 }, interview: { available: true, score: 61 } } }, aptitude: { accuracy: 48, weakTopics: [{ topic: 'Percentages', accuracy: 48, attempted: 8 }] }, revisionCount: 0, resume: { missingSkills: [] }, interview: { overallScore: 61 }, companyReadiness: [], weaknesses: [{ module: 'aptitude', area: 'Percentages', score: 48, severity: 'high' }] };
  const first = buildRecommendations(context); const second = buildRecommendations(context);
  assert.deepEqual(first, second);
  assert.equal(first[0].module, 'aptitude');
  const tasks = buildTasks({ intelligence: { nextBestAction: first[0], secondaryActions: first.slice(1, 3) }, availableMinutes: 45 });
  assert.equal(tasks[0].title, first[0].title);
  assert.ok(tasks.some((task) => task.module === 'aptitude'));
  assert.ok(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) <= 45);
});

test('starter and company intelligence create safe, evidence-based planner priorities', () => {
  const starter = buildRecommendations({ user: { profileCompletionPercentage: 20 }, readiness: { categoryScores: { dsa: { available: false } } }, aptitude: { accuracy: null, weakTopics: [] }, revisionCount: 0, resume: null, interview: null, companyReadiness: [], weaknesses: [] });
  const starterTasks = buildTasks({ intelligence: { nextBestAction: starter[0], secondaryActions: starter.slice(1, 3) }, availableMinutes: 90 });
  assert.equal(starterTasks[0].module, 'profile'); assert.ok(starterTasks.some((task) => task.module === 'resume'));
  const company = buildRecommendations({ user: { profileCompletionPercentage: 100 }, readiness: { categoryScores: { dsa: { available: true, score: 80 }, aptitude: { available: true, score: 80 }, interview: { available: true, score: 80 } } }, aptitude: { accuracy: 80, weakTopics: [] }, revisionCount: 0, resume: { missingSkills: [] }, interview: { overallScore: 80 }, companyReadiness: [{ company: 'Acme', missingSkills: ['SQL'], components: {} }], weaknesses: [] });
  assert.ok(company.some((item) => item.module === 'company' && item.reason.includes('Acme')));
});

test('planner completion remains planner-only', () => {
  const result = summary({ tasks: [{ title: 'Solve a DSA problem', module: 'dsa', completed: true, estimatedMinutes: 25, reason: 'Recorded planner task only.' }] });
  assert.equal(result.completedTasks, 1); assert.equal(result.tasks[0].completed, true); assert.equal(Object.hasOwn(result.tasks[0], 'solved'), false);
});

test('company readiness adapter is deterministic and safely skips invalid target companies', async () => {
  const calls = []; const resolver = async ({ slug }) => { calls.push(slug); if (slug === 'missing') throw new Error('not found'); return { company: slug.toUpperCase(), score: 72, components: { skills: 80 }, missingSkills: ['sql'] }; };
  assert.deepEqual(await targetCompanyReadiness({ targetCompanies: [] }, resolver), []);
  const first = await targetCompanyReadiness({ targetCompanies: ['Valid Co', 'missing'] }, resolver);
  const second = await targetCompanyReadiness({ targetCompanies: ['Valid Co', 'missing'] }, resolver);
  assert.deepEqual(first, [{ company: 'VALID-CO', score: 72, components: { skills: 80 }, missingSkills: ['sql'] }]);
  assert.deepEqual(first, second); assert.ok(calls.includes('valid-co'));
});

test('readiness trends preserve missing scores and use deterministic thresholds', () => {
  assert.equal(direction(1), 'stable'); assert.equal(direction(2), 'improving'); assert.equal(direction(-2), 'declining');
  const snapshots = [{ capturedAt: '2026-01-01', overallReadiness: 60, categoryScores: { profile: 80, resume: null, dsa: 50, aptitude: 70, interview: null } }, { capturedAt: '2026-01-10', overallReadiness: 66, categoryScores: { profile: 80, resume: 72, dsa: 48, aptitude: 75, interview: null } }];
  const trends = calculateTrends(snapshots); assert.equal(trends.hasEnoughData, true); assert.equal(trends.overall.direction, 'improving'); assert.equal(trends.categories.find((item) => item.name === 'resume').change, null); assert.equal(trends.strongestImprovement.name, 'aptitude'); assert.equal(trends.needsAttention.name, 'dsa');
  assert.equal(calculateTrends([snapshots[0]]).hasEnoughData, false);
  assert.equal(materiallyChanged({ overallReadiness: 60, categoryScores: snapshots[0].categoryScores }, { overallReadiness: 61, categoryScores: snapshots[0].categoryScores }), false);
});
