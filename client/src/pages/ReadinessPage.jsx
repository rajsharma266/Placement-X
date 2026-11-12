import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Building2, Clock3, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getIntelligence, getIntelligenceTrends } from '../api/intelligenceService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Progress from '../components/ui/Progress';
import ScoreDisplay from '../components/ui/ScoreDisplay';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StatePanel';

const categoryNames = { profile: 'Profile', resume: 'Resume', dsa: 'DSA', aptitude: 'Aptitude', interview: 'Interview' };
const categoryOrder = ['profile', 'resume', 'dsa', 'aptitude', 'interview'];
const confidenceLabel = (value) => value ? `${value[0].toUpperCase()}${value.slice(1)} confidence` : 'Evidence available';
const readable = (value) => value ? `${value[0].toUpperCase()}${value.slice(1)}` : 'Not specified';
const safeRoute = (route) => typeof route === 'string' && route.startsWith('/') ? route : '/planner';

const EvidenceList = ({ title, items, empty }) => <div>
  <h3 className="text-sm font-medium text-slate-200">{title}</h3>
  {items.length ? <div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <Badge key={item}>{categoryNames[item] || readable(item)}</Badge>)}</div> : <p className="mt-2 text-sm text-slate-500">{empty}</p>}
</div>;

const ActionCard = ({ action, secondary = false }) => {
  if (!action) return null;
  return <div className={`min-w-0 rounded-2xl border p-4 ${secondary ? 'border-slate-800 bg-slate-950/30' : 'border-indigo-400/20 bg-indigo-500/10 sm:p-5'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="font-semibold text-white">{action.title}</p>{action.reason && <p className="mt-1 text-sm leading-6 text-slate-400">{action.reason}</p>}</div>
      {action.priority && <Badge tone={action.priority === 'critical' || action.priority === 'high' ? 'warning' : 'accent'}>{readable(action.priority)} priority</Badge>}
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {Number.isFinite(action.estimatedMinutes) ? <p className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock3 size={14} />About {action.estimatedMinutes} min</p> : <span />}
      <Link to={safeRoute(action.route)}><Button variant={secondary ? 'secondary' : 'primary'} fullWidth={false}>{secondary ? 'Open action' : 'Start this action'} <ArrowRight size={16} className="ml-2" /></Button></Link>
    </div>
  </div>;
};

const ReadinessPage = () => {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [intelligence, history] = await Promise.all([getIntelligence(), getIntelligenceTrends()]); setData(intelligence); setTrends(history); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load placement intelligence.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  if (loading && !data) return <div className="space-y-6"><Skeleton className="h-28 w-full max-w-2xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div><Skeleton className="h-96" /></div>;
  if (!data) return <ErrorState title="Placement intelligence is unavailable" description={error} onRetry={load} />;

  const categoryScores = data.categoryScores || {};
  const availableCategories = Array.isArray(data.evidenceCoverage?.evidenceCategories) ? data.evidenceCoverage.evidenceCategories : categoryOrder.filter((key) => categoryScores[key]?.available);
  const missingCategories = Array.isArray(data.missingEvidence) ? data.missingEvidence : categoryOrder.filter((key) => categoryScores[key] && !categoryScores[key].available);
  const hasMeasuredEvidence = availableCategories.length > 0 && Boolean(data.evidenceCoverage?.normalizedWeightTotal);
  const scoreIsAvailable = hasMeasuredEvidence && Number.isFinite(data.overallReadiness);
  const categories = categoryOrder.map((key) => [key, categoryScores[key]]).filter(([, item]) => item);
  const consistency = data.preparationConsistency;
  const hasConsistency = consistency && [consistency.activePreparationDays, consistency.plannerCompletionPercentage, consistency.recentActivityCount].some(Number.isFinite);

  return <div className="space-y-6 pb-4">
    <PageHeader eyebrow="PLACEMENT INTELLIGENCE REPORT" title="Readiness, explained" description="A clear view of your recorded preparation evidence—not a placement guarantee." />

    <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]" aria-labelledby="overall-readiness-heading">
      <Card className="overflow-hidden p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p id="overall-readiness-heading" className="text-xs font-semibold tracking-[.16em] text-indigo-300">OVERALL READINESS</p><Badge tone={scoreIsAvailable ? 'accent' : 'warning'}>{scoreIsAvailable ? 'Evidence-based estimate' : 'Evidence still building'}</Badge></div><Target className="shrink-0 text-indigo-300" aria-hidden="true" /></div>
        <div className="mt-5"><ScoreDisplay score={scoreIsAvailable ? data.overallReadiness : null} label={scoreIsAvailable ? `${data.overallReadiness}% PLACEMENT READY` : 'READINESS STILL BEING MEASURED'} description={scoreIsAvailable ? 'This score uses only categories with recorded evidence; missing evidence is excluded from the calculation.' : 'PlacementX needs more preparation evidence before it can show a dependable readiness score.'} /></div>
      </Card>
      <Card className="p-6 sm:p-7" aria-labelledby="coverage-heading"><h2 id="coverage-heading" className="text-lg font-semibold">Evidence coverage</h2><p className="mt-2 text-sm leading-6 text-slate-400">Coverage describes what PlacementX can measure. It is separate from your readiness score.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><EvidenceList title="Available" items={availableCategories} empty="No measured categories yet." /><EvidenceList title="Still needed" items={missingCategories} empty="All supported categories have evidence." /></div></Card>
    </section>

    {!hasMeasuredEvidence && <EmptyState title="PlacementX needs more preparation evidence" description="Complete your profile, analyze a resume, solve DSA, attempt aptitude, and finish a first mock interview. Your next actions will guide the best place to start." action={<Link to="/profile"><Button fullWidth={false}>Update profile <ArrowRight size={16} className="ml-2" /></Button></Link>} />}

    <section aria-labelledby="why-score-heading"><Card className="p-5 sm:p-7"><h2 id="why-score-heading" className="text-xl font-semibold">Why this score?</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Each category is included only when the intelligence response has preparation evidence for it. Missing categories are not shown as zero progress.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{categories.map(([key, item]) => <article key={key} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/30 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-white">{categoryNames[key]}</h3><Badge tone={item.available ? 'accent' : 'warning'}>{item.available && Number.isFinite(item.score) ? `${item.score}%` : 'Insufficient evidence'}</Badge></div>{item.available ? <><p className="mt-3 text-sm leading-6 text-slate-400">Recorded {categoryNames[key].toLowerCase()} evidence is included in this readiness estimate.</p><p className="mt-3 text-xs font-medium text-slate-300">Evidence available</p>{Number.isFinite(item.score) && <Progress className="mt-2" value={item.score} showValue={false} />}</> : <p className="mt-3 text-sm leading-6 text-slate-400">More {categoryNames[key].toLowerCase()} activity is needed before PlacementX can measure this category.</p>}</article>)}</div></Card></section>

    <section className="grid gap-4 xl:grid-cols-2" aria-label="Strengths and priority areas">
      <Card className="p-5 sm:p-6"><h2 className="text-xl font-semibold">Strengths</h2><p className="mt-1 text-sm text-slate-400">Your strongest recorded preparation signals.</p>{data.strengths?.length ? <div className="mt-5 space-y-3">{data.strengths.slice(0, 3).map((item) => <article key={`${item.module}-${item.area}`} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-white">{readable(item.module)} · {item.area}</p><p className="mt-1 text-sm text-slate-400">{item.evidence}</p></div>{Number.isFinite(item.score) && <Badge tone="good">{item.score}%</Badge>}</div><p className="mt-3 text-xs text-slate-300">{confidenceLabel(item.confidence)}</p></article>)}</div> : <p className="mt-5 text-sm leading-6 text-slate-500">More evidence is needed before dependable strengths can be identified.</p>}</Card>
      <Card className="p-5 sm:p-6"><h2 className="text-xl font-semibold">Priority areas</h2><p className="mt-1 text-sm text-slate-400">Actionable opportunities, based on recorded evidence.</p>{data.weaknesses?.length ? <div className="mt-5 space-y-3">{data.weaknesses.slice(0, 4).map((item) => <article key={`${item.module}-${item.area}`} className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-white">{readable(item.module)} · {item.area}</p><p className="mt-1 text-sm text-slate-400">{item.evidence}</p></div><Badge tone="warning">{readable(item.severity)} priority</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Badge>{confidenceLabel(item.confidence)}</Badge>{Number.isFinite(item.score) && <Badge>{item.score}%</Badge>}</div></article>)}</div> : <p className="mt-5 text-sm leading-6 text-slate-500">No priority weakness is established yet. Continue building evidence across your preparation.</p>}</Card>
    </section>

    <section aria-labelledby="next-action-heading"><Card className="p-5 sm:p-7"><h2 id="next-action-heading" className="text-xl font-semibold">Next best action</h2><p className="mt-1 text-sm text-slate-400">Recommended by your existing preparation plan.</p>{data.nextBestAction ? <div className="mt-5"><ActionCard action={data.nextBestAction} /></div> : <div className="mt-5"><EmptyState title="No action is ready yet" description="Open your preparation plan to create or review your next step." action={<Link to="/planner"><Button fullWidth={false}>Open planner <ArrowRight size={16} className="ml-2" /></Button></Link>} /></div>}{data.secondaryActions?.length ? <div className="mt-5"><h3 className="text-sm font-semibold tracking-wide text-slate-300">ALSO CONSIDER</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{data.secondaryActions.slice(0, 2).map((action, index) => <ActionCard key={action._id || `${action.title}-${index}`} action={action} secondary />)}</div></div> : null}</Card></section>

    <section className="grid gap-4 lg:grid-cols-2" aria-label="Role and preparation consistency">
      <Card className="p-5 sm:p-6"><h2 className="text-xl font-semibold">Target role readiness</h2>{data.roleReadiness?.role ? <div className="mt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-3xl font-semibold text-white">{data.roleReadiness.confidence !== 'insufficient' && Number.isFinite(data.roleReadiness.score) ? `${data.roleReadiness.score}%` : 'Being measured'}</p><p className="mt-1 text-sm text-slate-400">{data.roleReadiness.role}</p></div><Badge tone="accent">{confidenceLabel(data.roleReadiness.confidence)}</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-medium text-slate-200">Strongest evidence</h3><p className="mt-2 text-sm leading-6 text-slate-400">{Object.entries(data.roleReadiness.evidence || {}).filter(([, value]) => value !== null && value !== undefined && value !== 0).map(([key, value]) => `${readable(key.replace(/([A-Z])/g, ' $1').trim())}: ${typeof value === 'number' ? `${value}${key.toLowerCase().includes('score') || key.toLowerCase().includes('match') ? '%' : ''}` : value}`).join(' · ') || 'No role-specific evidence supplied yet.'}</p></div><div><h3 className="text-sm font-medium text-slate-200">Key gaps</h3><p className="mt-2 text-sm leading-6 text-slate-400">{data.roleReadiness.gaps?.length ? data.roleReadiness.gaps.join(', ') : 'No role-specific gaps supplied yet.'}</p></div></div></div> : <EmptyState title="Set a target role" description="Add a role to your profile to receive role-specific readiness context." action={<Link to="/profile"><Button fullWidth={false}>Update profile <ArrowRight size={16} className="ml-2" /></Button></Link>} />}</Card>
      <Card className="p-5 sm:p-6"><h2 className="text-xl font-semibold">Preparation consistency</h2>{hasConsistency ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{Number.isFinite(consistency.activePreparationDays) && <div className="rounded-xl bg-slate-950/30 p-4"><p className="text-2xl font-semibold">{consistency.activePreparationDays}</p><p className="mt-1 text-sm text-slate-400">active preparation days</p></div>}{Number.isFinite(consistency.plannerCompletionPercentage) && <div className="rounded-xl bg-slate-950/30 p-4"><p className="text-2xl font-semibold">{consistency.plannerCompletionPercentage}%</p><p className="mt-1 text-sm text-slate-400">planner completion</p></div>}{Number.isFinite(consistency.recentActivityCount) && <div className="rounded-xl bg-slate-950/30 p-4"><p className="text-2xl font-semibold">{consistency.recentActivityCount}</p><p className="mt-1 text-sm text-slate-400">recent activities</p></div>}</div> : <p className="mt-5 text-sm leading-6 text-slate-500">Consistency context will appear when meaningful activity is available.</p>}<p className="mt-5 text-xs leading-5 text-slate-500">Consistency provides context only; it is not included as a technical readiness score.</p></Card>
    </section>

    <section aria-labelledby="trends-heading"><Card className="p-5 sm:p-7"><h2 id="trends-heading" className="text-xl font-semibold">Progress over time</h2>{trends?.hasEnoughData ? <><p className="mt-2 text-sm text-slate-400">Overall readiness: {trends.overall.previous}% → {trends.overall.current}% · {trends.overall.direction}</p><div className="mt-5 grid gap-3 md:grid-cols-2">{trends.categories.filter((item) => item.change !== null).map((item) => <div key={item.name} className="rounded-xl bg-slate-950/30 p-4"><p className="font-medium">{categoryNames[item.name]}</p><p className="mt-1 text-sm text-slate-400">{item.previous}% → {item.current}% · {item.change > 0 ? '+' : ''}{item.change} points · {item.direction}</p></div>)}</div>{trends.strongestImprovement && <p className="mt-5 text-sm text-emerald-200">Strongest improvement: {categoryNames[trends.strongestImprovement.name]} (+{trends.strongestImprovement.change}).</p>}{trends.needsAttention && <p className="mt-2 text-sm text-amber-200">Needs attention: {categoryNames[trends.needsAttention.name]} ({trends.needsAttention.change} points).</p>}</> : <p className="mt-3 text-sm leading-6 text-slate-400">Keep preparing to unlock progress trends.</p>}</Card></section>
    <section aria-labelledby="company-readiness-heading"><Card className="p-5 sm:p-7"><div className="flex flex-wrap items-center gap-3"><Building2 className="text-indigo-300" aria-hidden="true" /><div><h2 id="company-readiness-heading" className="text-xl font-semibold">Target company readiness</h2><p className="mt-1 text-sm text-slate-400">Only companies configured in your profile are shown.</p></div></div>{data.companyReadiness?.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.companyReadiness.map((company) => { const components = Object.entries(company.components || {}).filter(([, value]) => Number.isFinite(value)); const strongest = components.slice().sort((a, b) => b[1] - a[1])[0]; const biggestGap = company.missingSkills?.[0]; return <article key={company.company} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/30 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-white">{company.company}</h3><Badge tone="accent">{Number.isFinite(company.score) ? `${company.score}%` : 'Insufficient evidence'}</Badge></div><p className="mt-3 text-xs text-slate-300">{company.confidence ? confidenceLabel(company.confidence) : 'Confidence not supplied'}</p><dl className="mt-4 space-y-2 text-sm leading-6"><div><dt className="text-slate-500">Strongest area</dt><dd className="text-slate-200">{strongest ? `${readable(strongest[0])} (${strongest[1]}%)` : 'No area supplied yet.'}</dd></div><div><dt className="text-slate-500">Biggest gap</dt><dd className="text-slate-200">{biggestGap || 'No stored gap supplied yet.'}</dd></div><div><dt className="text-slate-500">Next priority</dt><dd className="text-slate-200">{company.nextPreparationPriority || 'Not supplied by the current intelligence response.'}</dd></div></dl></article>; })}</div> : <div className="mt-5"><EmptyState title="Add target companies" description="Add companies to your profile to see their evidence-based preparation context." action={<Link to="/profile"><Button fullWidth={false}>Update profile <ArrowRight size={16} className="ml-2" /></Button></Link>} /></div>}</Card></section>

    {data.crossModuleInsights?.length ? <section aria-labelledby="insights-heading"><Card className="p-5 sm:p-7"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-indigo-300" aria-hidden="true" /><div className="min-w-0"><h2 id="insights-heading" className="text-xl font-semibold">Cross-module insights</h2><p className="mt-1 text-sm text-slate-400">Connections identified from your recorded preparation evidence.</p><div className="mt-5 space-y-3">{data.crossModuleInsights.map((insight, index) => <article key={insight.type || index} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><p className="text-sm leading-6 text-slate-300">{insight.message}</p></article>)}</div></div></div></Card></section> : null}
  </div>;
};

export default ReadinessPage;
