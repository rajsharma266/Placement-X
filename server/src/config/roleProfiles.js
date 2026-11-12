const roleProfiles = {
  'MERN Developer': { skills: ['javascript', 'react', 'node.js', 'express', 'mongodb', 'rest api', 'git', 'sql'], keywords: ['api', 'database', 'frontend', 'backend'] },
  'Frontend Developer': { skills: ['javascript', 'react', 'html', 'css', 'git'], keywords: ['responsive', 'component', 'accessibility'] },
  'Backend Developer': { skills: ['node.js', 'express', 'mongodb', 'sql', 'rest api', 'git'], keywords: ['api', 'database', 'authentication'] },
  'Software Developer': { skills: ['data structures', 'algorithms', 'git', 'java'], keywords: ['complexity', 'testing', 'design'] },
  'Data Analyst': { skills: ['sql', 'python', 'excel', 'power bi', 'tableau'], keywords: ['dashboard', 'analysis', 'visualization'] },
};
const getRoleProfile = (role) => roleProfiles[role] || { skills: [], keywords: [] };
module.exports = { roleProfiles, getRoleProfile };
