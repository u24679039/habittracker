import React, { useState } from 'react';
import Dashboard from './components/dashboard';
import Analytics from './components/Analytics';
import './styles/tokens.css';

const DEMO_USER_ID = 5;

// --- STUB COMPONENTS FOR DEMO MOCKUPS ---
const HabitsStub = () => (
  <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
    <h2>Habit Management</h2>
    <p style={{ color: '#666', marginBottom: '1.5rem' }}>Manage your active habits, log progress, or add new routines.</p>
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <h3>Active Habits</h3>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        <li style={{ padding: '1rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🧘 Meditate 10 min (Daily)</span>
          <span style={{ background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>Active 100%</span>
        </li>
        <li style={{ padding: '1rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📖 Read 20 pages (Daily)</span>
          <span style={{ background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>Active 50%</span>
        </li>
        <li style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🏃 Exercise 30 min (Weekly)</span>
          <span style={{ background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>Active 30%</span>
        </li>
      </ul>
    </div>
  </div>
);

const GroupsStub = () => (
  <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
    <h2>Micro-Groups & Accountability</h2>
    <p style={{ color: '#666', marginBottom: '1.5rem' }}>Collaborate with peers, share activity feeds, and maintain group streaks.</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3>Alpha Squad</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>4/5 members • Avg streak: 14 days</p>
        <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '6px', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem' }}>Code: ABC-1234</p>
      </div>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3>Study Sprint</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>5/5 members • Avg streak: 6 days</p>
        <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '6px', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem' }}>Code: ABC-5678</p>
      </div>
    </div>
  </div>
);

const AccountModal = ({ onClose, currentRole }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <h3>Account Settings</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Logged in as: <strong>Demo Student (ID: {DEMO_USER_ID})</strong></p>
      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Email</label>
        <input type="text" value="student@habittracker.demo" readOnly style={{ width: '100%', padding: '8px', background: '#f9f9f9', border: '1px solid #ccc', borderRadius: '4px' }} />
      </div>
      <div style={{ margin: '1.5rem 0' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Role</label>
        <input type="text" value={currentRole} readOnly style={{ width: '100%', padding: '8px', background: '#f9f9f9', border: '1px solid #ccc', borderRadius: '4px' }} />
      </div>
      <button onClick={onClose} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>Close</button>
    </div>
  </div>
);

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState('USER');

  return (
    <div>
      <nav className="hf-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="hf-nav-brand">HabitTracker</span>
          <button
            className={`hf-nav-tab ${tab === 'dashboard' ? 'hf-nav-tab--active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`hf-nav-tab ${tab === 'habits' ? 'hf-nav-tab--active' : ''}`}
            onClick={() => setTab('habits')}
          >
            Habits
          </button>
          <button
            className={`hf-nav-tab ${tab === 'groups' ? 'hf-nav-tab--active' : ''}`}
            onClick={() => setTab('groups')}
          >
            Groups
          </button>
          <button
            className={`hf-nav-tab ${tab === 'analytics' ? 'hf-nav-tab--active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {/* Right Header Widgets: Notifications, Role Switcher, Account Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              title="Notifications">
              {/* Clean SVG Bell Icon replacing the emoji */}
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ color: '#555' }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '280px', background: '#e6f4ea', border: '1px solid #ceead6', borderRadius: '8px', padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, textAlign: 'left' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#137333' }}>Notifications</h4>
                <div style={{ fontSize: '0.85rem', marginBottom: '8px', borderBottom: '1px solid #d1e7dd', paddingBottom: '6px', color: '#333' }}>
                  ⭐ <strong>New milestone achieved!</strong><br/><span style={{ color: '#555', fontSize: '0.75rem' }}>1h ago</span>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '8px', borderBottom: '1px solid #d1e7dd', paddingBottom: '6px', color: '#333' }}>
                  ⭐ <strong>Someone hit a streak!</strong><br/><span style={{ color: '#555', fontSize: '0.75rem' }}>3h ago</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#333' }}>
                  ⭐ <strong>Remember to Exercise!</strong><br/><span style={{ color: '#555', fontSize: '0.75rem' }}>7h ago</span>
                </div>
              </div>
            )}
          </div>

          {/* Role Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '15px', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
              {currentRole} ▾
            </button>
            {roleDropdownOpen && (
              <div style={{ position: 'absolute', right: 0, top: '35px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '100px', zIndex: 100 }}>
                <div onClick={() => { setCurrentRole('USER'); setRoleDropdownOpen(false); }} style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}>USER</div>
                <div onClick={() => { setCurrentRole('ADMIN'); setRoleDropdownOpen(false); }} style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}>ADMIN</div>
              </div>
            )}
          </div>

          {/* Account Profile Icon */}
          <button 
            onClick={() => setShowAccountModal(true)}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ccc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#333', fontSize: '0.85rem' }}
            title="Account Settings">
            DS
          </button>
        </div>
      </nav>

      {/* Dynamic Tab Rendering */}
      {tab === 'dashboard' && <Dashboard userId={DEMO_USER_ID} onNavigate={setTab} />}
      {tab === 'habits' && <HabitsStub />}
      {tab === 'groups' && <GroupsStub />}
      {tab === 'analytics' && <Analytics userId={DEMO_USER_ID} />}

      {/* Account Settings Popup Modal */}
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} currentRole={currentRole} />}
    </div>
  );
}