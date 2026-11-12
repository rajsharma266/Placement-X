import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, HelpCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/FormFields';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StatePanel';
import { getAptitudeCatalog, getAptitudeQuestions, markAptitudeRevision, submitAptitudeAttempt } from '../api/aptitudeService';

const categories = { quantitative: 'Quantitative Aptitude', 'logical-reasoning': 'Logical Reasoning', 'verbal-ability': 'Verbal Ability' };
const errorText = (error) => error.response?.data?.message || 'Unable to load practice questions.';

function Question({ item, number, total, selected, result, busy, choose, submit, toggleRevision, previous, next }) {
  return <Card className="min-w-0 p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-indigo-500/15 px-2.5 py-1 font-semibold text-indigo-200">QUESTION {number + 1} / {total}</span><span className="rounded-full border border-slate-700 px-2.5 py-1 capitalize text-slate-300">{item.difficulty}</span><span className="text-slate-400">{item.topic}</span><span className="ml-auto text-slate-500">~{Math.round((item.estimatedTimeSeconds || 90) / 60)} min</span></div>
    <h2 className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-8 sm:text-xl">{item.question}</h2>
    <fieldset className="mt-5 space-y-2" disabled={Boolean(result) || busy}><legend className="sr-only">Answer options</legend>{item.options.map((option, index) => <label key={index} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-6 focus-within:ring-2 focus-within:ring-indigo-400 ${result?.correctAnswer === index ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : selected === index ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500'}`}><input type="radio" name={`practice-${item._id}`} checked={selected === index} onChange={() => choose(index)} className="size-4 shrink-0 accent-indigo-400" />{option}</label>)}</fieldset>
    {result && <div className={`mt-5 rounded-xl border p-4 text-sm ${result.isCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}><p className="font-semibold">{result.isCorrect ? 'Correct' : `Correct answer: ${item.options[result.correctAnswer]}`}</p><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-300">{result.explanation}</p><button onClick={toggleRevision} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 hover:text-white"><Bookmark size={15} />{result.attempt.revisionRequired ? 'Marked for revision' : 'Mark for revision'}</button></div>}
    <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4"><Button variant="secondary" disabled={busy || number === 0} onClick={previous}><ArrowLeft size={16} className="mr-2" />Previous</Button>{!result && <Button isLoading={busy} disabled={selected === null || busy} onClick={submit}>Check answer</Button>}<Button variant="secondary" className="ml-auto" disabled={busy || number === total - 1} onClick={next}>Next<ArrowRight size={16} className="ml-2" /></Button></div>
  </Card>;
}

export default function AptitudePractice({ progress, onAttempt }) {
  const [category, setCategory] = useState(''); const [topic, setTopic] = useState(''); const [difficulty, setDifficulty] = useState(''); const [count, setCount] = useState(10);
  const [catalog, setCatalog] = useState(null); const [questions, setQuestions] = useState([]); const [total, setTotal] = useState(0); const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); const [results, setResults] = useState({}); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [generation, setGeneration] = useState(0);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [contents, list] = await Promise.all([
        getAptitudeCatalog({ ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}) }),
        getAptitudeQuestions({ page: 1, limit: count, order: 'adaptive', ...(category ? { category } : {}), ...(topic ? { topic } : {}), ...(difficulty ? { difficulty } : {}) }),
      ]);
      setCatalog(contents); setQuestions(list.items || []); setTotal(list.pagination?.total || 0);
      setIndex(0); setAnswers({}); setResults({});
    } catch (caught) { setError(errorText(caught)); }
    finally { setLoading(false); }
  }, [category, topic, difficulty, count]);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load, generation]);
  const submit = async () => {
    const item = questions[index]; const selectedAnswer = answers[item._id];
    if (selectedAnswer === undefined || results[item._id] || busy) return;
    setBusy(true);
    try { const result = await submitAptitudeAttempt({ questionId: item._id, selectedAnswer }); setResults((old) => ({ ...old, [item._id]: result })); onAttempt(); getAptitudeCatalog({ ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}) }).then(setCatalog).catch(() => {}); }
    catch (caught) { toast.error(errorText(caught)); }
    finally { setBusy(false); }
  };
  const toggleRevision = async () => {
    const item = questions[index]; const result = results[item._id];
    if (!result || busy) return;
    setBusy(true);
    try { const updated = await markAptitudeRevision(result.attempt._id, !result.attempt.revisionRequired); setResults((old) => ({ ...old, [item._id]: { ...result, attempt: { ...result.attempt, revisionRequired: updated.revisionRequired } } })); }
    catch (caught) { toast.error(errorText(caught)); }
    finally { setBusy(false); }
  };
  const pick = (recommendation) => { setCategory(recommendation.category); setTopic(recommendation.topic); };
  const topics = catalog?.topics || []; const item = questions[index];
  return <div className="space-y-5">
    <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><Select label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setTopic(''); }}><option value="">All categories</option>{Object.entries(categories).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select><Select label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topics.map((value) => <option key={`${value.category}:${value.topic}`} value={value.topic}>{value.topic} ({value.available})</option>)}</Select><Select label="Difficulty" value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setTopic(''); }}><option value="">All levels</option>{['easy', 'medium', 'hard'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select><Select label="Questions in set" value={count} onChange={(event) => setCount(Number(event.target.value))}>{[5, 10, 20, 30, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</Select></Card>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400"><span>{total} matching question{total === 1 ? '' : 's'} · showing {questions.length}</span><Button variant="ghost" onClick={() => setGeneration((value) => value + 1)}><RefreshCw size={15} className="mr-2" />New set</Button></div>
    {loading ? <Skeleton className="h-80" /> : error ? <ErrorState description={error} onRetry={load} /> : !item ? <EmptyState icon={HelpCircle} title="No matching questions" description="Try a different category, topic or difficulty. Practice never substitutes unrelated questions." /> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><Question item={item} number={index} total={questions.length} selected={answers[item._id] ?? null} result={results[item._id]} busy={busy} choose={(value) => setAnswers((old) => ({ ...old, [item._id]: value }))} submit={submit} toggleRevision={toggleRevision} previous={() => setIndex(index - 1)} next={() => setIndex(index + 1)} /><Card className="p-5"><h3 className="text-sm font-semibold">Practice progress</h3><p className="mt-2 text-sm text-slate-400">{progress?.attempted || 0} attempts · {progress?.accuracy ?? '—'}% accuracy</p><div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-5">{questions.map((q, position) => <button key={q._id} onClick={() => setIndex(position)} aria-label={`Practice question ${position + 1}`} className={`grid aspect-square min-h-9 place-items-center rounded-lg border text-xs focus:ring-2 focus:ring-indigo-400 ${position === index ? 'border-indigo-300 bg-indigo-500/25' : results[q._id] ? 'border-emerald-500/40 text-emerald-200' : answers[q._id] !== undefined ? 'border-indigo-500/40 text-indigo-200' : 'border-slate-700 text-slate-400'}`}>{position + 1}</button>)}</div></Card></div>}
    {catalog?.recommendations?.length > 0 && <Card className="p-5"><h2 className="font-semibold">Suggested next topics</h2><p className="mt-1 text-xs text-slate-400">Based on recorded answers. A topic needs at least three attempts before it can be called weak.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{catalog.recommendations.slice(0, 3).map((value) => <button key={`${value.category}:${value.topic}`} onClick={() => pick(value)} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-left hover:border-indigo-400 focus:ring-2 focus:ring-indigo-400"><span className="block text-sm font-semibold text-white">{value.topic}</span><span className="mt-1 block text-xs text-slate-400">{value.status === 'priority-practice' ? `${value.accuracy}% accuracy · practice priority` : value.status === 'needs-assessment' ? `${value.attempted} attempts · needs assessment` : `${value.accuracy}% accuracy · maintain`}</span></button>)}</div></Card>}
  </div>;
}
