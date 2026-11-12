const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const dsaRoutes = require('./routes/dsaRoutes');
const aptitudeRoutes = require('./routes/aptitudeRoutes');
const companyRoutes = require('./routes/companyRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const readinessRoutes = require('./routes/readinessRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.disable('x-powered-by');
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && !allowedOrigins.length) {
  throw new Error('CLIENT_URL must list at least one allowed origin in production');
}
const allowOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && !allowedOrigins.length)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
};
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const generalMax = Number(process.env.RATE_LIMIT_MAX) || 500;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 20;
app.use(helmet());
app.use(cors({ origin: allowOrigin, credentials: true }));
app.use(rateLimit({ windowMs, max: generalMax, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', rateLimit({ windowMs, max: authMax, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/dsa', dsaRoutes);
app.use('/api/v1/aptitude', aptitudeRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/readiness', readinessRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/planner', plannerRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);
app.use('/api/v1/mentor', mentorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
