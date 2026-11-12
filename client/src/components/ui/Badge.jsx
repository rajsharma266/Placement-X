const Badge = ({ children, tone = 'default' }) => {
  const tones = { default: 'border-slate-700 bg-slate-800 text-slate-300', good: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', accent: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200', warning: 'border-amber-400/20 bg-amber-400/10 text-amber-200' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};
export default Badge;
