
import React, { useState, useEffect } from 'react';
import LandingPage from './apps/landing/LandingPage';
import Dashboard from './apps/dashboard/Dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  // Handle Hash Routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'dashboard') setView('dashboard');
      else setView('landing');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      {view === 'landing' ? (
        <LandingPage onEnter={() => window.location.hash = 'dashboard'} />
      ) : (
        <Dashboard onBack={() => window.location.hash = ''} />
      )}
    </div>
  );
};

export default App;
