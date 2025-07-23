import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import UserList from './components/UserList';
import TrialRequests from './components/TrialRequests';
import ActivationControls from './components/ActivationControls';

const ADMIN_EMAILS = [
  'ekthar.xd@gmail.com',
  'ekthar@proton.me',
  'ijdtheaplpha@gmail.com',
];

const GOOGLE_CLIENT_ID = '772148919938-sjr2i8bi34ncr95tq9foa9ufhaask9cv.apps.googleusercontent.com';
const API_BASE = 'http://localhost:4100'; // cache-bust 20250723

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const googleButtonRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [trialRequests, setTrialRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.google || isLoggedIn) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 260,
    });
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && adminEmail) {
      fetchUsers();
    }
    // eslint-disable-next-line
  }, [isLoggedIn, adminEmail]);

  function handleCredentialResponse(response) {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const user = JSON.parse(jsonPayload);
    if (ADMIN_EMAILS.includes(user.email)) {
      setIsLoggedIn(true);
      setAdminEmail(user.email);
      setLoginError('');
    } else {
      setLoginError('Access denied: not an admin email.');
    }
  }

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`;
      console.log('Fetching users with adminEmail:', adminEmail, 'URL:', url);
      const res = await fetch(url);
      if (!res.ok) {
        let errText = await res.text();
        console.error('Fetch users failed:', res.status, errText);
        throw new Error('Failed to fetch users: ' + res.status + ' ' + errText);
      }
      const data = await res.json();
      setUsers(data.users || []);
      // Filter trial requests from users with status 'pending' or 'trial-requested'
      setTrialRequests((data.users || []).filter(u => u.status === 'pending' || u.status === 'trial-requested'));
    } catch (err) {
      setError(err.message);
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(email) {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, email }),
      });
      if (!res.ok) throw new Error('Failed to activate user');
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(email) {
    // If you have a deactivate endpoint, use it. Otherwise, skip or implement as needed.
    alert('Deactivate endpoint not implemented.');
  }

  async function handleSetTrial(email, days) {
    if (!email || !days) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/approve-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, email, days }),
      });
      if (!res.ok) throw new Error('Failed to set trial');
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveTrial(email) {
    await handleSetTrial(email, 7); // Default to 7 days
  }

  async function handleRejectTrial(email) {
    // If you have a reject endpoint, use it. Otherwise, skip or implement as needed.
    alert('Reject endpoint not implemented.');
  }

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <h2>Beesoft Admin Portal</h2>
        <div ref={googleButtonRef} style={{ margin: '20px 0' }}></div>
        {loginError && <div className="error">{loginError}</div>}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header>
        <h2>Beesoft Admin Dashboard</h2>
        <div className="admin-info">Logged in as: {adminEmail}</div>
      </header>
      <main>
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        <section className="users-section">
          <h3>All Users</h3>
          <UserList users={users} />
        </section>
        <section className="trials-section">
          <h3>Trial Requests</h3>
          <TrialRequests requests={trialRequests} onApprove={handleApproveTrial} onReject={handleRejectTrial} />
        </section>
        <section className="activation-section">
          <h3>Activation Controls</h3>
          <ActivationControls onActivate={handleActivate} onDeactivate={handleDeactivate} onSetTrial={handleSetTrial} />
        </section>
      </main>
    </div>
  );
}

export default App;
