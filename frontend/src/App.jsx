import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import OrgDetail from './pages/OrgDetail.jsx';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [orgCount, setOrgCount] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar toggleTheme={toggleTheme} theme={theme} orgCount={orgCount} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home setOrgCount={setOrgCount} />} />
            <Route path="/org/:id" element={<OrgDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
