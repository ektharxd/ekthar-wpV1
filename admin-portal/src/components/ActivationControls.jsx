import React, { useState } from 'react';

function ActivationControls({ onActivate, onSetTrial, onDeactivate }) {
  const [email, setEmail] = useState('');
  const [trialDays, setTrialDays] = useState(7);

  return (
    <div className="activation-controls">
      <div>
        <input
          type="email"
          placeholder="User email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button onClick={() => onActivate(email)}>Activate</button>
        <button onClick={() => onDeactivate(email)}>Deactivate</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          type="email"
          placeholder="User email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={30}
          value={trialDays}
          onChange={e => setTrialDays(Number(e.target.value))}
          style={{ width: 60, marginLeft: 8 }}
        />
        <span style={{ marginLeft: 4 }}>days trial</span>
        <button onClick={() => onSetTrial(email, trialDays)} style={{ marginLeft: 8 }}>
          Set Trial
        </button>
      </div>
    </div>
  );
}

export default ActivationControls;
