import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';

export default function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="topbar">
      {/* Left - Logo only */}
      <div className="topbar-logo">
        <img src="/logo.png" alt="A2Z Technologies" />
      </div>

      {/* Center - Title */}
      <div className="topbar-title">A2Z Project Management</div>

      {/* Right - User info */}
      <div className="topbar-right">
        <Avatar name={user.name} role={user.role} />
        <span style={{ fontWeight: 500, color: '#fff' }}>{user.name}</span>
        <span className="role-pill">{user.role}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
