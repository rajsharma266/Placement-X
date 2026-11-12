import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../features/auth/useAuth';

const initial = { fullName: '', email: '', password: '' };
const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register'; const [form, setForm] = useState(initial); const [errors, setErrors] = useState({}); const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const validate = () => { const next = {}; if (isRegister && form.fullName.trim().length < 2) next.fullName = 'Enter your full name'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address'; if (form.password.length < 8) next.password = 'Use at least 8 characters'; setErrors(next); return !Object.keys(next).length; };
  const handleSubmit = async (event) => { event.preventDefault(); if (!validate()) return; setSubmitting(true); try { const currentUser = isRegister ? await signUp(form) : await signIn(form); toast.success(isRegister ? 'Welcome to PlacementX!' : 'Welcome back!'); const fallback = currentUser.onboardingCompleted ? '/dashboard' : '/onboarding'; navigate(location.state?.from?.pathname || fallback, { replace: true }); } catch (error) { toast.error(error.response?.data?.message || 'Something went wrong. Please try again.'); } finally { setSubmitting(false); } };
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  return <AuthLayout title={isRegister ? 'Create your account' : 'Welcome back'} subtitle={isRegister ? 'Start your placement-readiness journey.' : 'Continue building your placement confidence.'}><form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>{isRegister && <Input label="Full name" placeholder="Your full name" value={form.fullName} onChange={update('fullName')} error={errors.fullName} autoComplete="name" />}<Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} error={errors.email} autoComplete="email" /><PasswordInput label="Password" placeholder="At least 8 characters" value={form.password} onChange={update('password')} error={errors.password} autoComplete={isRegister ? 'new-password' : 'current-password'} /><Button type="submit" fullWidth isLoading={submitting}>{isRegister ? 'Create account' : 'Sign in'}</Button></form><p className="mt-7 text-center text-sm text-slate-400">{isRegister ? 'Already have an account?' : 'New to PlacementX?'} <Link className="font-semibold text-indigo-300 hover:text-indigo-200" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p></AuthLayout>;
};
export default AuthPage;
