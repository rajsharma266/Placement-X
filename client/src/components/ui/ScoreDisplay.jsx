import Progress from './Progress';
const ScoreDisplay = ({ score, label = 'Score', description }) => <div><p className="text-xs font-semibold tracking-[.16em] text-indigo-300">{label}</p><p className="mt-2 text-4xl font-semibold tracking-tight text-white">{score === null || score === undefined ? '—' : `${score}%`}</p>{score !== null && score !== undefined && <Progress className="mt-4" value={score} showValue={false} />}{description && <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>}</div>;
export default ScoreDisplay;
