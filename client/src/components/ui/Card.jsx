const Card = ({ children, className = '' }) => <section className={`rounded-2xl border border-slate-800 bg-slate-900/65 shadow-[0_16px_40px_rgba(2,6,23,.18)] ${className}`}>{children}</section>;
export default Card;
