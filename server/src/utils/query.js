const ApiError = require('./ApiError');
const parsePagination = (query) => { const page = Math.max(Number.parseInt(query.page, 10) || 1, 1); const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100); return { page, limit, skip: (page - 1) * limit }; };
const assertObjectId = (id) => { if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, 'Invalid resource identifier'); };
const listResponse = (items, total, { page, limit }) => ({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
module.exports = { parsePagination, assertObjectId, listResponse };
