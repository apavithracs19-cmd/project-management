import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Avatar, StatusBadge, TypeTag, formatMs, Spinner, Empty, LiveTimer } from '../components/UI';

// ── Shared report view used by both Admin and QC ────────────────────────────
export function ReportView() {
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${p}`);
      setReport(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(period); }, [period, fetchReport]);

  const handlePeriod = (p) => { setPeriod(p); };

  const now = new Date();
  const dateLabel = period === 'daily'
    ? now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div className="report-period-toggle">
          <button
            className={`rpt-pill ${period === 'daily' ? 'active' : ''}`}
            onClick={() => handlePeriod('daily')}
          >📅 Daily</button>
          <button
            className={`rpt-pill ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => handlePeriod('monthly')}
          >📆 Monthly</button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{dateLabel}</span>
      </div>

      {loading ? <Spinner /> : !report ? <Empty icon="📊" text="No report data" /> : (
        <>
          {/* Summary metrics */}
          <div className="metrics metrics-3" style={{ marginBottom: 28 }}>
            <div className="metric">
              <div className="m-label">✅ Completed</div>
              <div className="m-val" style={{ color: '#8ee339' }}>{report.totalDone}</div>
              <div className="m-sub">projects done</div>
            </div>
            <div className="metric">
              <div className="m-label">⏳ Pending / Active</div>
              <div className="m-val" style={{ color: '#ffca4b' }}>{report.totalPending}</div>
              <div className="m-sub">{report.totalActive} in progress</div>
            </div>
            <div className="metric">
              <div className="m-label">📋 Total Tracked</div>
              <div className="m-val">{report.totalDone + report.totalPending}</div>
              <div className="m-sub">in this period</div>
            </div>
          </div>

          {/* User Activity Table */}
          <p className="section-title">👥 Developer Activity</p>
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Developer</th>
                    <th>Work Time</th>
                    <th>Idle / No-work</th>
                    <th>Break Time</th>
                    <th>Done</th>
                    <th>Pending</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {report.devActivity.map(d => (
                    <tr key={d.user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={d.user.name} role="developer" size={26} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.user.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="rpt-time rpt-work">{formatMs(d.workMs) || '—'}</span>
                      </td>
                      <td>
                        <span className="rpt-time rpt-nowork">{formatMs(d.noWorkMs) || '—'}</span>
                      </td>
                      <td>
                        <span className="rpt-time rpt-break">{formatMs(d.breakMs) || '—'}</span>
                      </td>
                      <td><span className="badge b-done">{d.doneCount}</span></td>
                      <td><span className="badge b-pending">{d.pendingCount}</span></td>
                      <td><span className="badge b-progress">{d.activeCount}</span></td>
                    </tr>
                  ))}
                  {report.devActivity.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>No activity in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Completed Projects list */}
          <p className="section-title">🏁 Completed Projects ({report.totalDone})</p>
          <div className="card">
            {report.doneProjects.length === 0
              ? <Empty icon="📋" text="No projects completed in this period" />
              : report.doneProjects.map(p => (
                  <div className="data-row" key={p.id}>
                    <TypeTag type={p.type} />
                    <span style={{ flex: 1, fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.assignedToName}</span>
                    <StatusBadge status="done" />
                    <span className="rpt-time rpt-work" style={{ minWidth: 60, textAlign: 'right' }}>
                      {formatMs(p.duration)}
                    </span>
                  </div>
                ))
            }
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab]         = useState('overview');
  const [data, setData]       = useState(null);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'developer', phone: '' });
  const [addErr, setAddErr]   = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editErr, setEditErr] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/admin/summary');
      setData(res.data);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchUsers()]).finally(() => setLoading(false));
    const id = setInterval(fetchSummary, 5000);
    return () => clearInterval(id);
  }, [fetchSummary, fetchUsers]);

  const handleAddUser = async e => {
    e.preventDefault();
    setAddErr('');
    try {
      await api.post('/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'developer', phone: '' });
      setShowAddUser(false);
      fetchUsers();
    } catch (err) {
      setAddErr(err.response?.data?.error || 'Failed to add user');
    }
  };

  const handleEditUser = async e => {
    e.preventDefault();
    setEditErr('');
    try {
      await api.put(`/users/${editingUser.id}`, {
        name:     editingUser.name,
        email:    editingUser.email,
        password: editingUser.password || undefined,
        role:     editingUser.role,
        phone:    editingUser.phone,
      });
      setEditingUser(null);
      fetchUsers();
      fetchSummary();
    } catch (err) {
      setEditErr(err.response?.data?.error || 'Failed to update user');
    }
  };

  if (loading) return <div className="page-wrap"><Spinner /></div>;

  const { devStats = [], totalDone = 0, totalPending = 0, totalActive = 0, recentActivity = [] } = data || {};
  const working = devStats.filter(d => d.status === 'working').length;
  const idle    = devStats.filter(d => d.status === 'idle').length;
  const nowork  = devStats.filter(d => d.status === 'nowork').length;

  const TABS = [
    ['overview', 'Overview'],
    ['developers', 'Developers'],
    ['history', 'History'],
    ['reports', '📊 Reports'],
    ['users', 'Manage Users'],
  ];

  return (
    <div className="page-wrap">
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <div key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <div className="metrics metrics-4">
            <div className="metric">
              <div className="m-label">Working now</div>
              <div className="m-val" style={{ color: '#3B6D11' }}>{working}</div>
              <div className="m-sub">developers active</div>
            </div>
            <div className="metric">
              <div className="m-label">Idle</div>
              <div className="m-val" style={{ color: '#854F0B' }}>{idle}</div>
              <div className="m-sub">no active task</div>
            </div>
            <div className="metric">
              <div className="m-label">No-work logged</div>
              <div className="m-val" style={{ color: '#555' }}>{nowork}</div>
              <div className="m-sub">in idle session</div>
            </div>
            <div className="metric">
              <div className="m-label">Projects done</div>
              <div className="m-val">{totalDone}</div>
              <div className="m-sub">{totalPending} pending · {totalActive} active</div>
            </div>
          </div>

          <p className="section-title">Developer status</p>
          <div className="dev-grid">
            {devStats.map(({ user: u, status, totalWorkMs, totalNoWorkMs, activeProject, pendingCount }) => (
              <div className="dev-card" key={u.id}>
                <div className="dev-header">
                  <Avatar name={u.name} role="developer" />
                  <div style={{ flex: 1 }}>
                    <div className="dev-name">{u.name}</div>
                    <div className="dev-role">{pendingCount} pending task{pendingCount !== 1 ? 's' : ''}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                {activeProject
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <TypeTag type={activeProject.type} />
                      <span style={{ flex: 1 }}>{activeProject.title}</span>
                      <LiveTimer startTime={activeProject.startTime} className="badge b-progress" />
                    </div>
                  : <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No active task</div>}
                <div className="dev-stats">
                  <span>⏱ Work: <b>{formatMs(totalWorkMs)}</b></span>
                  <span>☕ No-work: <b>{formatMs(totalNoWorkMs)}</b></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── DEVELOPERS DETAIL ── */}
      {tab === 'developers' && (
        <>
          <p className="section-title">Detailed breakdown</p>
          {devStats.map(({ user: u, status, totalWorkMs, totalNoWorkMs, projects = [], noworkSessions = [] }) => (
            <div className="card" key={u.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar name={u.name} role="developer" size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                    Work: <b>{formatMs(totalWorkMs)}</b> &nbsp;|&nbsp; No-work: <b>{formatMs(totalNoWorkMs)}</b>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              {projects.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No projects assigned</div>
                : projects.map(p => (
                    <div className="data-row" key={p.id}>
                      <TypeTag type={p.type} />
                      <span style={{ flex: 1 }}>{p.title}</span>
                      <StatusBadge status={p.status} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 50, textAlign: 'right' }}>
                        {p.duration ? formatMs(p.duration) : p.status === 'in_progress' ? <LiveTimer startTime={p.startTime} className="" /> : '—'}
                      </span>
                    </div>
                  ))}
              {noworkSessions.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
                  No-work sessions: {noworkSessions.length} (Total: {formatMs(noworkSessions.reduce((a, n) => a + n.duration, 0))})
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <>
          <p className="section-title">All completed activity</p>
          <div className="card">
            {recentActivity.length === 0
              ? <Empty icon="📋" text="No completed activity yet" />
              : recentActivity.map(item => (
                  <div className="data-row" key={item.id}>
                    <Avatar name={item._kind === 'project' ? item.assignedToName : item.devName} role="developer" size={24} />
                    {item._kind === 'project'
                      ? <><TypeTag type={item.type} /><span style={{ flex: 1 }}>{item.title}</span><span style={{ color: 'var(--text-2)', fontSize: 12 }}>{item.assignedToName}</span></>
                      : <><span className="ptag pt-nowork">no-work</span><span style={{ flex: 1 }}>Idle session</span><span style={{ color: 'var(--text-2)', fontSize: 12 }}>{item.devName}</span></>}
                    <span style={{ fontWeight: 600, color: item._kind === 'project' ? '#3B6D11' : '#555', fontSize: 12, minWidth: 50, textAlign: 'right' }}>
                      {formatMs(item.duration)}
                    </span>
                  </div>
                ))}
          </div>
        </>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && <ReportView />}

      {/* ── MANAGE USERS ── */}
      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>All users</p>
            <button className="btn btn-accent btn-sm" onClick={() => { setShowAddUser(v => !v); setEditingUser(null); }}>
              {showAddUser ? 'Cancel' : '+ Add user'}
            </button>
          </div>

          {showAddUser && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>➕ New user</div>
              {addErr && <div className="login-error">{addErr}</div>}
              <form onSubmit={handleAddUser}>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input className="form-control" required value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Anand Kumar" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" required value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="anand@pf.com" />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>Password</label>
                    <input className="form-control" type="password" required value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="min 6 chars" />
                  </div>
                  <div className="form-group">
                    <label>Phone number</label>
                    <input className="form-control" value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 9876543210" />
                  </div>
                  <div className="form-group" style={{ maxWidth: 160 }}>
                    <label>Role</label>
                    <select className="form-control" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="developer">Developer</option>
                      <option value="qc">QC</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-accent" type="submit">Create user</button>
              </form>
            </div>
          )}

          {editingUser && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>✏️ Edit user — <code style={{ color: 'var(--text-3)', fontSize: 11 }}>{editingUser.id}</code></div>
              {editErr && <div className="login-error">{editErr}</div>}
              <form onSubmit={handleEditUser}>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ flex: '0 0 100%' }}>
                    <label>User ID (read-only)</label>
                    <input className="form-control" readOnly value={editingUser.id} style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-3)', cursor: 'not-allowed', fontFamily: 'monospace', fontSize: 12 }} />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input className="form-control" required value={editingUser.name} onChange={e => setEditingUser(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Anand Kumar" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" required value={editingUser.email} onChange={e => setEditingUser(p => ({ ...p, email: e.target.value }))} placeholder="anand@pf.com" />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>New password <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(leave blank to keep)</span></label>
                    <input className="form-control" type="password" value={editingUser.password || ''} onChange={e => setEditingUser(p => ({ ...p, password: e.target.value }))} placeholder="new password" />
                  </div>
                  <div className="form-group">
                    <label>Phone number</label>
                    <input className="form-control" value={editingUser.phone || ''} onChange={e => setEditingUser(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 9876543210" />
                  </div>
                  <div className="form-group" style={{ maxWidth: 160 }}>
                    <label>Role</label>
                    <select className="form-control" value={editingUser.role} onChange={e => setEditingUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="developer">Developer</option>
                      <option value="qc">QC</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-accent" type="submit">Save changes</button>
                  <button className="btn btn-ghost" type="button" onClick={() => { setEditingUser(null); setEditErr(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            {users.map((u, i) => (
              <div className="data-row" key={u.id} style={i === 0 ? { paddingTop: 0 } : {}}>
                <Avatar name={u.name} role={u.role} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                    <span className="role-pill" style={{ fontSize: 9, padding: '2px 6px' }}>{u.role}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                    ID: <code style={{ color: 'var(--text-2)', fontSize: 10 }}>{u.id}</code> &nbsp;|&nbsp;
                    📧 <span style={{ color: 'var(--text-2)' }}>{u.email}</span> &nbsp;|&nbsp;
                    📞 <span style={{ color: 'var(--text-2)' }}>{u.phone || '—'}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setEditingUser({ id: u.id, name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' });
                  setEditErr('');
                  setShowAddUser(false);
                }}>
                  ✏️ Edit
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
