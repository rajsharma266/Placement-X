const Loader = ({ fullScreen = false }) => <div className={`${fullScreen ? 'min-h-screen bg-[#09111f]' : ''} grid place-items-center`}><span className="size-7 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" aria-label="Loading" /></div>;
export default Loader;
