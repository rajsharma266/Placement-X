const Activity = require('../models/Activity');
const snapshotTriggers = new Set(['profile-completed', 'dsa-solved', 'aptitude-attempt', 'resume-analyzed', 'interview-completed']);
const recordActivity = async (user, type, description, metadata = {}) => { const activity = await Activity.create({ user, type, description, metadata }); if (snapshotTriggers.has(type)) await require('./readinessSnapshotService').captureSnapshot(user, type); return activity; };
module.exports = { recordActivity };
