import { useCallback, useEffect, useState } from 'react';
import { FileSearch, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import FileDropzone from '../components/ui/FileDropzone';
import ResumeAnalysisReport from '../components/resume/ResumeAnalysisReport';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StatePanel';
import { analyzeResume, deleteResumeAnalysis, getResumeHistory } from '../api/resumeService';

const ResumePage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setHistory((await getResumeHistory({ page: 1, limit: 20 })).items || []); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load resume history.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const pick = (next) => {
    if (!next) return;
    if (next.type !== 'application/pdf' || !next.name.toLowerCase().endsWith('.pdf')) return toast.error('Only PDF resume files are supported.');
    if (next.size > 4_000_000) return toast.error('Resume must be 4 MB or smaller.');
    setFile(next);
  };
  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const data = await analyzeResume(file);
      setSelected(data.resume);
      setFile(null);
      toast.success('Resume analyzed');
      await load();
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Resume analysis failed.'); } finally { setAnalyzing(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this resume analysis?')) return;
    try { await deleteResumeAnalysis(id); if (selected?._id === id) setSelected(null); toast.success('Analysis deleted'); await load(); } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to delete analysis.'); }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-20 w-2/3" /><Skeleton className="h-64" /></div>;
  if (error) return <ErrorState description={error} onRetry={load} />;
  return <div className="space-y-7">
    <PageHeader eyebrow="RESUME ANALYZER" title="Make your resume placement ready" description="Upload a PDF resume for structured, placement-focused feedback. Your file is analyzed in memory and not stored as raw resume content." />
    <Card className="p-5 sm:p-7"><FileDropzone file={file} onChange={pick} disabled={analyzing} /><div className="mt-5 flex justify-end"><Button fullWidth={false} disabled={!file} isLoading={analyzing} onClick={analyze}><FileSearch size={16} className="mr-2" />Analyze resume</Button></div></Card>
    {selected && <section><h2 className="mb-4 text-lg font-semibold">Latest analysis</h2><ResumeAnalysisReport resume={selected} /></section>}
    <section><h2 className="mb-4 text-lg font-semibold">Analysis history</h2>{history.length ? <div className="grid gap-3">{history.map((item) => <Card key={item._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-medium">{item.fileName}</p><p className="mt-1 text-sm text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Previous analysis'}</p></div><Badge tone="accent">{item.score}%</Badge><div className="flex gap-2"><Button variant="secondary" fullWidth={false} className="h-9" onClick={() => navigate(`/resume/${item._id}`)}>Open report</Button><Button variant="ghost" fullWidth={false} className="h-9 text-rose-300" onClick={() => remove(item._id)} aria-label="Delete analysis"><Trash2 size={16} /></Button></div></Card>)}</div> : <EmptyState icon={FileSearch} title="No resume analyses yet" description="Upload your first PDF resume to receive structured feedback." />}</section>
  </div>;
};

export default ResumePage;
