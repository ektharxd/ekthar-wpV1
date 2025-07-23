import React from 'react';

function UserList({ users }) {
  return (
    <div className="user-list">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Trial Expiry</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={4}>No users found.</td></tr>
          ) : (
            users.map(user => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{user.status}</td>
                <td>{user.trialExpiry || '-'}</td>
                <td>{/* Actions placeholder */}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UserList;
