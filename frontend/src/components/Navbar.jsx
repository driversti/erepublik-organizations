import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar({ toggleTheme, theme, orgCount }) {
  return (
    <nav className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-3">
        <Link to="/" className="text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 hover:opacity-80">
          eOrganizations
        </Link>
        {orgCount != null && (
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {orgCount.toLocaleString()} orgs
          </span>
        )}
        <div className="flex-1" />
        <Link to="/stats" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
          Stats
        </Link>
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>
    </nav>
  );
}
