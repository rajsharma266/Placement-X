const variants = {
  primary: 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-400',
  secondary: 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
};

const Button = ({ children, className = '', isLoading = false, variant = 'primary', fullWidth = false, ...props }) => (
  <button className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#101a2d] disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
    {isLoading ? 'Please wait…' : children}
  </button>
);

export default Button;
