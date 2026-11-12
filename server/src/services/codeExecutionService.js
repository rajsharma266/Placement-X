const ApiError = require('../utils/ApiError');

const supportedLanguages = new Set(['cpp', 'javascript', 'python']);

const assertRequest = ({ language, code }) => {
  if (!supportedLanguages.has(language)) throw new ApiError(400, 'Unsupported programming language');
  if (typeof code !== 'string' || !code.trim()) throw new ApiError(400, 'Code is required');
  if (code.length > 100000) throw new ApiError(400, 'Code exceeds the 100 KB limit');
};

// The Express process deliberately never evaluates submitted code. Configure a
// purpose-built judge adapter at CODE_EXECUTION_PROVIDER_URL to enable this.
const execute = async ({ mode, question, language, code }) => {
  assertRequest({ language, code });
  const providerUrl = process.env.CODE_EXECUTION_PROVIDER_URL;
  if (!providerUrl) throw new ApiError(503, 'Code execution is not configured. Connect a sandboxed judge provider to enable Run and Submit.');

  const payload = {
    mode,
    language,
    code,
    question: {
      id: String(question._id), title: question.title,
      sampleTests: mode === 'run' ? question.examples.map(({ input, output }) => ({ input, expectedOutput: output })) : undefined,
    },
  };
  let response;
  try {
    response = await globalThis.fetch(providerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.CODE_EXECUTION_PROVIDER_TOKEN ? { Authorization: `Bearer ${process.env.CODE_EXECUTION_PROVIDER_TOKEN}` } : {}) }, body: JSON.stringify(payload), signal: globalThis.AbortSignal.timeout(15000) });
  } catch { throw new ApiError(502, 'Unable to reach the configured code-execution provider'); }
  if (!response.ok) throw new ApiError(502, 'The code-execution provider could not process this request');
  const result = await response.json();
  if (typeof result?.passed !== 'boolean') throw new ApiError(502, 'The code-execution provider returned an invalid result');
  return result;
};

module.exports = { execute, supportedLanguages };
