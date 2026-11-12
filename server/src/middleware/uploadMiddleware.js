const multer = require('multer'); const ApiError = require('../utils/ApiError');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4_000_000, files: 1 }, fileFilter: (_req, file, cb) => { if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return cb(new ApiError(400, 'Only PDF resume uploads are allowed')); return cb(null, true); } });
module.exports = upload;
