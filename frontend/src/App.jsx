import React, { useState } from 'react';
import Dashboard from './components/dashboard';
import Analytics from './components/Analytics';
import './styles/tokens.css';

// Standalone demo shell for this workstream. Once auth is integrated
// (Sprint 3), `userId` will come from the JWT session instead of this
// hardcoded stand-in. Update this to whatever userId your seed script
// actually printed if it's ever not 1 (see prisma/seed.js).
const DEMO_USER_ID = 5;

/**
 * App
 * Top-level shell for this workstream's standalone demo: a simple two-tab
 * nav (Dashboard / Analytics) with no routing library, since this isn't
 * meant to be the final integrated app - just enough to exercise both
 * pages independently before the other workstreams' pages (Habits,
 * Groups, Profile/Admin) are merged in at integration time.
 */
export default function App() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div>
      <nav className="hf-nav">
        <span className="hf-nav-brand">HabitTracker</span>
        <button
          className={`hf-nav-tab ${tab === 'dashboard' ? 'hf-nav-tab--active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`hf-nav-tab ${tab === 'analytics' ? 'hf-nav-tab--active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          Analytics
        </button>
      </nav>
      {tab === 'dashboard' ? <Dashboard userId={DEMO_USER_ID} /> : <Analytics userId={DEMO_USER_ID} />}
    </div>
  );
}
