const times = { easy: 60, medium: 90, hard: 120 };
// IDs derive from fixed positions. Append entries; do not reorder released rows.
const group = (category, topic, prefix, rows) => rows.map(([difficulty, question, options, correctAnswer, explanation, arithmetic], index) => ({
  bankId: `PX2-${prefix}-${String(index + 1).padStart(2, '0')}`,
  category, topic, difficulty, estimatedTimeSeconds: times[difficulty], question,
  options: options.split('|'), correctAnswer, explanation,
  ...(arithmetic === undefined ? {} : { arithmetic }),
}));
module.exports = group;
