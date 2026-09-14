import React, { useState } from 'react';
import Dashboard from './components/dashboard';
import Analytics from './components/Analytics';

// Standalone demo shell for this workstream. Once auth is integrated
// (Sprint 3), `userId` will come from the JWT session instead of this
// hardcoded stand-in. Update this to whatever userId your seed script
// actually printed if it's ever not 1 (see prisma/seed.js).
const DEMO_USER_ID = 7;

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
      <nav style={navStyle}>
        <strong style={{ marginRight: 24 }}>HabitForge</strong>
        <button style={tabStyle(tab === 'dashboard')} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button style={tabStyle(tab === 'analytics')} onClick={() => setTab('analytics')}>
          Analytics
        </button>
      </nav>
      {tab === 'dashboard' ? <Dashboard userId={DEMO_USER_ID} /> : <Analytics userId={DEMO_USER_ID} />}
    </div>
  );
}

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 24px',
  borderBottom: '1px solid #e4e4e4',
  fontFamily: 'Inter, sans-serif',
};

/** Returns the nav-button style, bolding and darkening whichever tab is currently active. */
function tabStyle(active) {
  return {
    background: 'none',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: active ? 600 : 400,
    color: active ? '#16181d' : '#6b7280',
    cursor: 'pointer',
    marginRight: 16,
  };
}
