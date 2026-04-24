export default function ThemeToggle({ theme, toggle }) {
  return (
    <button
      onClick={toggle}
      className="text-lg leading-none text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
