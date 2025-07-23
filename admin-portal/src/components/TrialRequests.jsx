import React from 'react';

function TrialRequests({ requests, onApprove, onReject }) {
  return (
    <div className="trial-requests">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Requested At</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan={4}>No trial requests.</td></tr>
          ) : (
            requests.map(req => (
              <tr key={req.email}>
                <td>{req.email}</td>
                <td>{req.requestedAt}</td>
                <td>{req.status}</td>
                <td>
                  <button onClick={() => onApprove(req.email)}>Approve</button>
                  <button onClick={() => onReject(req.email)}>Reject</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TrialRequests;
