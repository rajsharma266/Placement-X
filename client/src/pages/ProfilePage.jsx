import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { getProfile, updateProfile } from '../api/profileService';
import { useAuth } from '../features/auth/useAuth';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Select } from '../components/ui/FormFields';
import Button from '../components/ui/Button';
import { ErrorState, Skeleton } from '../components/ui/StatePanel';

const ProfilePage = () => {
  const { user, updateUser } = useAuth(); const [form, setForm] = useState(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { getProfile().then(({ user: profile }) => setForm({ ...profile, targetCompanies: (profile.targetCompanies || []).join(', '), skills: (profile.skills || []).join(', ') })).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load your profile.')); }, []);
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  if (!form) return <div className="space-y-6"><Skeleton className="h-20 w-2/3" /><Skeleton className="h-96" /></div>;
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setSaving(true); try { const payload = { fullName: form.fullName, college: form.college, degree: form.degree, branch: form.branch, graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined, cgpa: form.cgpa === '' ? undefined : Number(form.cgpa), targetRole: form.targetRole, targetCompanies: form.targetCompanies.split(',').map((value) => value.trim()).filter(Boolean), skills: form.skills.split(',').map((value) => value.trim()).filter(Boolean), preferredProgrammingLanguage: form.preferredProgrammingLanguage, onboardingCompleted: form.onboardingCompleted }; const { user: updated } = await updateProfile(payload); updateUser(updated); setForm({ ...updated, targetCompanies: (updated.targetCompanies || []).join(', '), skills: (updated.skills || []).join(', ') }); toast.success('Profile updated'); } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to update profile'); } finally { setSaving(false); } };
  return <div className="space-y-8"><PageHeader eyebrow="STUDENT PROFILE" title="Your preparation context" description="Keep these details current so PlacementX can make your readiness view more useful." /><form onSubmit={save}><Card className="p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><Input label="Full name" value={form.fullName || ''} onChange={change('fullName')} /><Input label="Email address" value={form.email || user?.email || ''} disabled /><Input label="College" value={form.college || ''} onChange={change('college')} /><Input label="Degree" value={form.degree || ''} onChange={change('degree')} /><Input label="Branch" value={form.branch || ''} onChange={change('branch')} /><Select label="Graduation year" value={form.graduationYear || ''} onChange={change('graduationYear')}><option value="">Select year</option>{[2026, 2027, 2028, 2029, 2030].map((year) => <option key={year} value={year}>{year}</option>)}</Select><Input label="CGPA" type="number" min="0" max="10" step="0.01" value={form.cgpa || ''} onChange={change('cgpa')} /><Input label="Target role" value={form.targetRole || ''} onChange={change('targetRole')} /><Input className="sm:col-span-2" label="Target companies" value={form.targetCompanies} onChange={change('targetCompanies')} placeholder="Amazon, TCS, Infosys" /><Input className="sm:col-span-2" label="Technical skills" value={form.skills} onChange={change('skills')} placeholder="JavaScript, SQL, React" /><Input label="Preferred programming language" value={form.preferredProgrammingLanguage || ''} onChange={change('preferredProgrammingLanguage')} /></div><div className="mt-7 flex justify-end"><Button fullWidth={false} isLoading={saving} type="submit"><Save size={16} className="mr-2" />Save profile</Button></div></Card></form></div>;
};
export default ProfilePage;
