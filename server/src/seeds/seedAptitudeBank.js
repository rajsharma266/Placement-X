require('dotenv').config({ quiet: true });
const { connectDatabase, disconnectDatabase } = require('../config/database');
const AptitudeQuestion = require('../models/AptitudeQuestion');
const bank = require('../questionBank');
const { validateBank } = require('../questionBank/validate');

const demoFilter = { question: /^Development demo:/i, options: ['Option A', 'Option B', 'Option C', 'Option D'] };
const deactivateDemos = async (Model = AptitudeQuestion) => {
  const result = await Model.updateMany({ ...demoFilter, isActive: true }, { $set: { isActive: false } });
  return result.modifiedCount || 0;
};

const seedBank = async (Model = AptitudeQuestion, questions = bank) => {
  const validation = validateBank(questions);
  if (!validation.valid) throw new Error(`Aptitude bank validation failed:\n${validation.issues.join('\n')}`);
  const summary = { total: questions.length, inserted: 0, updated: 0 };
  for (const item of questions) {
    const fields = { ...item };
    delete fields.arithmetic;
    const existing = await Model.findOne({ bankId: item.bankId });
    if (existing) { existing.set(fields); await existing.save(); summary.updated += 1; }
    else { await Model.create({ ...fields, isActive: true }); summary.inserted += 1; }
  }
  return summary;
};

const run = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Aptitude bank seeding is disabled in production');
  const validation = validateBank();
  if (!validation.valid) throw new Error(validation.issues.join('\n'));
  await connectDatabase();
  try {
    console.info('Aptitude bank seeded:', await seedBank());
    console.info('Exact demo questions deactivated:', await deactivateDemos());
  }
  finally { await disconnectDatabase(); }
};

if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedBank, deactivateDemos, demoFilter };
