const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailValidator },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    profileImage: { type: String, trim: true, default: '' },
    college: { type: String, trim: true, maxlength: 150, default: '' },
    degree: { type: String, trim: true, maxlength: 100, default: '' },
    branch: { type: String, trim: true, maxlength:100, default: '' },
    graduationYear: { type: Number, min: 2000, max: 2100 },
    currentSemester: { type: Number, min: 1, max: 12 },
    cgpa: { type: Number, min: 0, max: 10 },
    targetRole: { type: String, trim: true, maxlength: 100, default: '' },
    targetCompanies: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    preferredProgrammingLanguage: { type: String, trim: true, maxlength: 50, default: '' },
    profileCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    onboardingCompleted: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.password; delete ret.__v; return ret; } } },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);









