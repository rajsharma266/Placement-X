import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Flag, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/FormFields';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StatePanel';
import { getAptitudeCatalog, getAptitudeProgress, getActiveAptitudeAssessment, getAptitudeAssessment, startAptitudeAssessment, saveAptitudeAssessment, submitAptitudeAssessment } from '../api/aptitudeService';
import AptitudePractice from './AptitudePractice';

const categories = { quantitative: 'Quantitative Aptitude', 'logical-reasoning': 'Logical Reasoning', 'verbal-ability': 'Verbal Ability' };
const message = (error) => error.response?.data?.message || 'Something went wrong. Please retry.';
const clock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const counts = (questions) => ({ answered: questions.filter((q) => q.selectedAnswer !== null).length, marked: questions.filter((q) => q.markedForReview).length });

function Options({ question, selected, onSelect, disabled, correctAnswer }) {
  return <fieldset className="mt-5 space-y-2" disabled={disabled}><legend className="sr-only">Answer options</legend>{question.options.map((option, i) => <label key={i} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-6 focus-within:ring-2 focus-within:ring-indigo-400 ${correctAnswer === i ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : selected === i ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500'}`}><input type="radio" name="answer" checked={selected === i} onChange={() => onSelect(i)} className="size-4 shrink-0 accent-indigo-400" />{option}</label>)}</fieldset>;
}

export default function AptitudeWorkspace() {
  const [mode, setMode] = useState('practice');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [catalog, setCatalog] = useState(null);
  const [progress, setProgress] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [available, savedProgress, active] = await Promise.all([
        getAptitudeCatalog({ ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}) }),
        getAptitudeProgress(), getActiveAptitudeAssessment(),
      ]);
      setCatalog(available); setProgress(savedProgress);
      if (active) {
        setAssessment(active); setMode('timed');
        localStorage.setItem('placementx_aptitude_assessment', active._id);
      } else {
        const savedId = localStorage.getItem('placementx_aptitude_assessment');
        if (savedId) {
          try { setAssessment(await getAptitudeAssessment(savedId)); setMode('timed'); }
          catch { localStorage.removeItem('placementx_aptitude_assessment'); }
        }
      }
    } catch (caught) { setError(message(caught)); }
    finally { setLoading(false); }
  }, [category, difficulty]);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  const refresh = useCallback(() => { getAptitudeProgress().then(setProgress).catch(() => {}); }, []);
  const finish = useCallback((value) => { setAssessment(value); refresh(); }, [refresh]);
  const start = async () => {
    setStarting(true);
    try {
      const created = await startAptitudeAssessment({ category, difficulty, questionCount: Number(questionCount), durationMinutes: Number(durationMinutes) });
      localStorage.setItem('placementx_aptitude_assessment', created._id);
      setAssessment(created);
    } catch (caught) { toast.error(message(caught)); }
    finally { setStarting(false); }
  };
  if (loading) return <div className="space-y-5"><Skeleton className="h-16" /><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  if (error) return <ErrorState description={error} onRetry={load} />;
  if (assessment?.status === 'submitted') return <Results assessment={assessment} restart={() => { localStorage.removeItem('placementx_aptitude_assessment'); setAssessment(null); setMode('practice'); load(); }} />;
  if (assessment?.status === 'active') return <Timed assessment={assessment} setAssessment={setAssessment} finish={finish} />;

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-300">Assessment preparation</p><h1 className="mt-2 text-3xl font-bold">Aptitude workspace</h1><p className="mt-2 text-sm text-slate-400">Build accuracy with guided practice or take a timed assessment.</p></div>
    <div className="flex gap-2" role="tablist" aria-label="Assessment mode">{[['practice', 'Practice'], ['timed', 'Timed assessment']].map(([key, label]) => <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === key ? 'bg-indigo-500 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}>{label}</button>)}</div>
    {mode === 'practice' ? <AptitudePractice progress={progress} onAttempt={refresh} /> : <>
      <Card className="grid gap-3 p-4 sm:grid-cols-2"><Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{Object.entries(categories).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select><Select label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">All levels</option>{['easy', 'medium', 'hard'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select></Card>
      <Card className="p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-semibold"><Clock3 className="text-indigo-300" />Before you begin</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Choose a length, then answer at your own pace until the deadline. Answers save when selected. You can revisit questions and mark them for review. Results appear after submission or expiry.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Select label="Questions" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>{[1, 5, 10, 15, 20, 30].map((value) => <option key={value} value={value}>{value} questions</option>)}</Select><Select label="Duration" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{[5, 10, 20, 30, 45, 60, 90].map((value) => <option key={value} value={value}>{value} minutes</option>)}</Select></div><div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">{catalog?.total || 0} authored questions available for this category and difficulty. The server keeps the deadline even if you close this page.</div>{!catalog?.total ? <div className="mt-5"><EmptyState icon={HelpCircle} title="Question bank is empty" description="Choose another category or difficulty, or ask an administrator to add content." /></div> : <Button className="mt-5" isLoading={starting} disabled={starting || questionCount > catalog.total} onClick={start}>Start assessment <ArrowRight size={16} className="ml-2" /></Button>}</Card>
    </>}
  </div>;
}

function Palette({ questions, current, go, submit, busy }) {
  const state = counts(questions);
  return <><h2 className="text-sm font-semibold">Question navigator</h2><p className="mt-1 text-xs text-slate-400">Select a number to jump to a question.</p><div className="mt-4 grid grid-cols-5 gap-2">{questions.map((q, i) => <button key={`${q.questionId}-${i}`} disabled={busy} onClick={() => go(i)} aria-label={`Question ${i + 1}, ${q.selectedAnswer === null ? 'unanswered' : 'answered'}${q.markedForReview ? ', marked for review' : ''}`} aria-current={current === i ? 'step' : undefined} className={`relative grid aspect-square min-h-10 place-items-center rounded-lg border text-sm font-semibold focus:ring-2 focus:ring-indigo-400 ${current === i ? 'ring-2 ring-indigo-400' : ''} ${q.markedForReview ? 'border-amber-400 bg-amber-500/15 text-amber-200' : q.selectedAnswer !== null ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-700 bg-slate-950/40 text-slate-400'}`}>{i + 1}{q.markedForReview && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-300" />}</button>)}</div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4 text-center text-xs"><div><b className="block text-lg text-indigo-200">{state.answered}</b>Answered</div><div><b className="block text-lg text-slate-100">{questions.length - state.answered}</b>Unanswered</div><div><b className="block text-lg text-amber-200">{state.marked}</b>Review</div></div><Button fullWidth variant="secondary" className="mt-5" onClick={submit} disabled={busy}>Submit assessment</Button></>;
}

function Results({ assessment, restart }) {
  const r = assessment.result;
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-300">Assessment complete</p><h1 className="mt-2 text-3xl font-bold">Your results</h1><p className="mt-2 text-sm text-slate-400">Scored from your saved answers on the server.</p></div><Button variant="secondary" onClick={restart}>Back to aptitude</Button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[['Score', `${r.score}%`], ['Correct', r.correct], ['Incorrect', r.incorrect], ['Unanswered', r.unanswered], ['Accuracy', `${r.accuracy}%`], ['Time used', clock(r.timeUsedSeconds)]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></Card>)}</div><Card className="p-5"><h2 className="font-semibold">Topic performance</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{r.topicPerformance.map((t) => <div key={t.topic} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm"><div className="flex justify-between gap-2"><span>{t.topic}</span><b>{t.correct}/{t.total}</b></div><p className="mt-1 text-xs text-slate-400">{t.answered} answered · {t.accuracy}% accuracy</p></div>)}</div></Card><h2 className="text-lg font-semibold">Question review</h2>{r.review.map((q, i) => <Card key={`${q.questionId}-${i}`} className="p-5"><div className="flex flex-wrap gap-3 text-xs"><span className="font-semibold text-indigo-300">QUESTION {i + 1}</span><span className="text-slate-400">{q.topic}</span><span className={q.selectedAnswer === null ? 'text-slate-400' : q.isCorrect ? 'text-emerald-300' : 'text-rose-300'}>{q.selectedAnswer === null ? 'Unanswered' : q.isCorrect ? 'Correct' : 'Incorrect'}</span></div><h3 className="mt-3 whitespace-pre-wrap font-medium leading-7">{q.question}</h3><Options question={q} selected={q.selectedAnswer} onSelect={() => {}} disabled correctAnswer={q.correctAnswer} /><p className="mt-4 text-sm text-emerald-300">Correct answer: {q.options[q.correctAnswer]}</p><p className="mt-2 text-sm leading-6 text-slate-400">{q.explanation || 'No explanation is available.'}</p></Card>)}</div>;
}

function Timed({ assessment, setAssessment, finish }) {
  const [index, setIndex] = useState(0); const [remaining, setRemaining] = useState(1); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [paletteOpen, setPaletteOpen] = useState(false); const submitting = useRef(false);
  const q = assessment.questions[index]; const state = counts(assessment.questions);
  const submit = useCallback(async () => { if (submitting.current) return; submitting.current = true; setBusy(true); setConfirm(false); try { finish(await submitAptitudeAssessment(assessment._id)); } catch (error) { toast.error(message(error)); submitting.current = false; setBusy(false); } }, [assessment._id, finish]);
  useEffect(() => { const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(assessment.deadlineAt).getTime() - Date.now()) / 1000))); tick(); const interval = window.setInterval(tick, 1000); return () => window.clearInterval(interval); }, [assessment.deadlineAt]);
  useEffect(() => { if (remaining === 0) { const timer = window.setTimeout(submit, 0); return () => window.clearTimeout(timer); } return undefined; }, [remaining, submit]);
  const save = async (change) => { if (busy || submitting.current) return; setBusy(true); try { const updated = await saveAptitudeAssessment(assessment._id, { questionIndex: index, ...change }); if (updated.status === 'submitted') finish(updated); else setAssessment(updated); } catch (error) { toast.error(`Answer not saved: ${message(error)}`); } finally { setBusy(false); } };
  const palette = <Palette questions={assessment.questions} current={index} go={(i) => { setIndex(i); setPaletteOpen(false); }} submit={() => setConfirm(true)} busy={busy} />;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-300">Timed assessment · {categories[assessment.category] || 'All categories'}</p><h1 className="mt-1 text-2xl font-bold">Aptitude assessment</h1></div><div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg font-semibold ${remaining < 60 ? 'border-rose-400/50 bg-rose-500/10 text-rose-200' : 'border-slate-700 bg-slate-900'}`}><Clock3 size={18} />{clock(remaining)}</div></div><div className="flex justify-between text-xs text-slate-400"><span>Question {index + 1} of {assessment.questions.length}</span><span>{state.answered} answered</span></div><div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${100 * state.answered / assessment.questions.length}%` }} /></div><div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]"><Card className="min-w-0 p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-indigo-500/15 px-2.5 py-1 font-semibold text-indigo-200">QUESTION {index + 1}</span><span className="rounded-full border border-slate-700 px-2.5 py-1 capitalize text-slate-300">{q.difficulty}</span><span className="text-slate-400">{q.topic}</span></div><h2 className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-8 sm:text-xl">{q.question}</h2><Options question={q} selected={q.selectedAnswer} onSelect={(selectedAnswer) => save({ selectedAnswer })} disabled={busy} /><div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4"><Button variant="secondary" disabled={busy || index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={16} className="mr-2" />Previous</Button><Button variant={q.markedForReview ? 'primary' : 'ghost'} disabled={busy} onClick={() => save({ markedForReview: !q.markedForReview })}><Flag size={16} className="mr-2" />{q.markedForReview ? 'Marked' : 'Mark for Review'}</Button><Button className="ml-auto" disabled={busy} onClick={() => index < assessment.questions.length - 1 ? setIndex(index + 1) : setConfirm(true)}>{index < assessment.questions.length - 1 ? 'Save & Next' : 'Review & Submit'}<ArrowRight size={16} className="ml-2" /></Button></div><p className="mt-3 text-xs text-slate-500">{busy ? 'Saving…' : 'Changes save on the server when selected.'}</p></Card><aside className="hidden lg:block"><Card className="p-5">{palette}</Card></aside></div><div className="lg:hidden"><button onClick={() => setPaletteOpen(!paletteOpen)} aria-expanded={paletteOpen} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-left text-sm font-semibold">Question navigator {paletteOpen ? '▲' : '▼'}</button>{paletteOpen && <Card className="mt-2 p-4">{palette}</Card>}</div>{confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4"><div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#111d31] p-6 shadow-2xl"><h2 id="confirm-title" className="text-xl font-semibold">Submit assessment?</h2><p className="mt-3 text-sm leading-6 text-slate-300">{assessment.questions.length - state.answered} unanswered · {state.marked} marked for review. Results and explanations appear after submission.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button><Button disabled={busy} onClick={submit}>Submit now</Button></div></div></div>}</div>;
}

