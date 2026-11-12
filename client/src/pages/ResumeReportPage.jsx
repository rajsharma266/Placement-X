import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import ResumeAnalysisReport from '../components/resume/ResumeAnalysisReport';
import { ErrorState, Skeleton } from '../components/ui/StatePanel';
import { getResumeAnalysis, getResumeComparison } from '../api/resumeService';

const ResumeReportPage = () => {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { const [report, history] = await Promise.all([getResumeAnalysis(id), getResumeComparison(id)]); setResume(report.resume); setComparison(history); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to open this resume report.'); }
  }, [id]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  if (!resume && !error) return <div className="space-y-6"><Skeleton className="h-20 w-2/3" /><Skeleton className="h-96" /></div>;
  if (error) return <ErrorState title="Resume report unavailable" description={error} onRetry={load} />;

  return <div className="space-y-7">
    <Link to="/resume" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"><ArrowLeft size={16} />All resume analyses</Link>
    <PageHeader eyebrow="RESUME ANALYZER" title={resume.fileName || 'Resume report'} description="Your saved placement-focused analysis. This report is not re-analyzed when opened." />
    <ResumeAnalysisReport resume={resume} comparison={comparison} />
  </div>;
};

export default ResumeReportPage;
