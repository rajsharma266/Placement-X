const bank = require('./index');

const topics = {
  quantitative: new Set(['Percentages', 'Profit & Loss', 'Ratio', 'Time & Work', 'Speed & Distance', 'Averages', 'Probability']),
  'logical-reasoning': new Set(['Number Series', 'Coding-Decoding', 'Blood Relations', 'Directions', 'Syllogisms', 'Arrangements']),
  'verbal-ability': new Set(['Grammar', 'Sentence Correction', 'Vocabulary', 'Reading Comprehension']),
};
const placeholder = /development demo|option [a-d]\b|demo explanation|placeholder|lorem ipsum/i;
const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const numeric = (value) => Number.parseFloat(value.replaceAll(',', '').replace(/^[^\d.-]*/, ''));

const validateBank = (questions = bank) => {
  const issues = []; const ids = new Set(); const statements = new Set();
  questions.forEach((item, index) => {
    const at = `${item.bankId || `row ${index + 1}`}`;
    const fail = (reason) => issues.push(`${at}: ${reason}`);
    if (!item.bankId || ids.has(item.bankId)) fail('missing or duplicate bank ID');
    ids.add(item.bankId);
    if (typeof item.question !== 'string' || item.question.trim().length < 20) fail('question statement is too short');
    if (statements.has(normalize(item.question || ''))) fail('duplicate question statement');
    statements.add(normalize(item.question || ''));
    if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some((value) => typeof value !== 'string' || !value.trim())) fail('exactly four non-empty options required');
    if (new Set((item.options || []).map(normalize)).size !== 4) fail('options must be unique');
    if (!Number.isInteger(item.correctAnswer) || item.correctAnswer < 0 || item.correctAnswer > 3) fail('invalid correct answer index');
    if (typeof item.explanation !== 'string' || item.explanation.trim().length < 60) fail('explanation must be specific and detailed');
    if (!topics[item.category]?.has(item.topic)) fail('invalid category or topic');
    if (!['easy', 'medium', 'hard'].includes(item.difficulty)) fail('invalid difficulty');
    if (!Number.isInteger(item.estimatedTimeSeconds) || item.estimatedTimeSeconds < 15 || item.estimatedTimeSeconds > 600) fail('invalid estimated time');
    if ([item.question, item.explanation, ...(item.options || [])].some((value) => placeholder.test(value || ''))) fail('placeholder text found');
    if (item.arithmetic !== undefined) {
      const selected = item.options?.[item.correctAnswer];
      const displayed = selected && numeric(selected);
      if (!Number.isFinite(item.arithmetic) || !Number.isFinite(displayed) || Math.abs(item.arithmetic - displayed) > 0.001) fail('arithmetic check differs from selected answer');
    }
  });
  const distribution = {};
  questions.forEach((item) => {
    distribution[item.category] ||= { total: 0, topics: {}, difficulty: {} };
    const row = distribution[item.category]; row.total += 1;
    row.topics[item.topic] = (row.topics[item.topic] || 0) + 1;
    row.difficulty[item.difficulty] = (row.difficulty[item.difficulty] || 0) + 1;
  });
  if ((distribution.quantitative?.total || 0) < 50) issues.push('quantitative bank has fewer than 50 questions');
  if ((distribution['logical-reasoning']?.total || 0) < 40) issues.push('logical bank has fewer than 40 questions');
  if ((distribution['verbal-ability']?.total || 0) < 30) issues.push('verbal bank has fewer than 30 questions');
  return { valid: issues.length === 0, total: questions.length, arithmeticChecks: questions.filter((item) => item.arithmetic !== undefined).length, distribution, issues };
};

if (require.main === module) {
  const result = validateBank();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

module.exports = { validateBank, topics };
