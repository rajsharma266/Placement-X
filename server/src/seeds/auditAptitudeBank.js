require('dotenv').config({ quiet: true });
const { connectDatabase, disconnectDatabase } = require('../config/database');
const AptitudeQuestion = require('../models/AptitudeQuestion');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const { demoFilter } = require('./seedAptitudeBank');
const { realQuestionFilter } = require('../services/aptitudeAssessmentService');

const run = async () => {
  await connectDatabase();
  try {
    const demoIds = await AptitudeQuestion.find(demoFilter).distinct('_id');
    const [all, seeded, activeReal, demos, activeDemos, historicalDemoAttempts, allAttempts] = await Promise.all([
      AptitudeQuestion.countDocuments(), AptitudeQuestion.countDocuments({ bankId: /^PX2-/ }),
      AptitudeQuestion.countDocuments(realQuestionFilter), AptitudeQuestion.countDocuments(demoFilter),
      AptitudeQuestion.countDocuments({ ...demoFilter, isActive: true }),
      AptitudeAttempt.countDocuments({ question: { $in: demoIds } }), AptitudeAttempt.countDocuments(),
    ]);
    console.info(JSON.stringify({ all, seeded, activeReal, demos, activeDemos, historicalDemoAttempts, allAttempts }));
  } finally { await disconnectDatabase(); }
};
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
