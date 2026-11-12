const MIN_EVIDENCE = 3;

const summarizeProgress = (rows) => {
  const attempted = rows.reduce((sum, row) => sum + row.attempted, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  const categoryPerformance = {};
  const topicPerformance = rows.map((row) => ({
    category: row._id.category, topic: row._id.topic, attempted: row.attempted,
    correct: row.correct, accuracy: Math.round(row.correct / row.attempted * 100),
    evidence: row.attempted < MIN_EVIDENCE ? 'needs-assessment' : 'established',
  })).sort((a, b) => a.category.localeCompare(b.category) || a.topic.localeCompare(b.topic));
  topicPerformance.forEach((row) => {
    categoryPerformance[row.category] ||= { attempted: 0, correct: 0 };
    categoryPerformance[row.category].attempted += row.attempted;
    categoryPerformance[row.category].correct += row.correct;
  });
  Object.values(categoryPerformance).forEach((row) => { row.accuracy = Math.round(row.correct / row.attempted * 100); });
  const weakTopics = topicPerformance.filter((row) => row.evidence === 'established' && row.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted || a.topic.localeCompare(b.topic));
  const needsAssessment = topicPerformance.filter((row) => row.evidence === 'needs-assessment');
  return { attempted, correct, accuracy: attempted ? Math.round(correct / attempted * 100) : null,
    categoryPerformance, topicPerformance, weakTopics, needsAssessment,
    improvementOpportunities: weakTopics.map((row) => ({ topic: row.topic, category: row.category, reason: `${row.accuracy}% accuracy across ${row.attempted} attempts` })) };
};

const recommendTopics = (performance, available) => {
  const byTopic = new Map(performance.map((row) => [`${row.category}:${row.topic}`, row]));
  return available.map((item) => {
    const evidence = byTopic.get(`${item.category}:${item.topic}`);
    const status = !evidence || evidence.attempted < MIN_EVIDENCE ? 'needs-assessment' : evidence.accuracy < 60 ? 'priority-practice' : 'maintain';
    return { category: item.category, topic: item.topic, available: item.available,
      attempted: evidence?.attempted || 0, accuracy: evidence?.accuracy ?? null, status };
  }).sort((a, b) => {
    const rank = { 'priority-practice': 0, 'needs-assessment': 1, maintain: 2 };
    return rank[a.status] - rank[b.status] || (a.accuracy ?? 101) - (b.accuracy ?? 101)
      || a.attempted - b.attempted || a.category.localeCompare(b.category) || a.topic.localeCompare(b.topic);
  });
};

const orderPracticeQuestions = (questions, recent) => {
  const latest = new Map();
  recent.forEach((item) => { const key = String(item.question); if (!latest.has(key)) latest.set(key, item); });
  const lastId = recent[0] && String(recent[0].question);
  const rank = (question) => {
    const attempt = latest.get(String(question._id));
    if (!attempt) return 2;
    if (attempt.revisionRequired) return 0;
    return attempt.isCorrect ? 3 : 1;
  };
  return [...questions].sort((a, b) => {
    const aLast = String(a._id) === lastId ? 1 : 0;
    const bLast = String(b._id) === lastId ? 1 : 0;
    return aLast - bLast || rank(a) - rank(b) || String(a.bankId || a._id).localeCompare(String(b.bankId || b._id));
  });
};

module.exports = { MIN_EVIDENCE, summarizeProgress, recommendTopics, orderPracticeQuestions };
