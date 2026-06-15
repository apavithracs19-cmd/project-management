import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TypeTag, StatusBadge, formatMs, Spinner, Empty, LiveTimer } from '../components/UI';

export default function DevDashboard() {
  const { user, login }  = useAuth();
  const [tab, setTab] = useState('work');
  const [projects, setProjects]         = useState([]);
  const [noworkSessions, setNWSessions] = useState([]);
  const [activeNW, setActiveNW]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setAL]          = useState('');

  // Profile state
  const [profile, setProfile]       = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [profileErr, setProfileErr] = useState('');
  const [profileOk, setProfileOk]   = useState('');
  const [profLoading, setProfLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, nwRes] = await Promise.all([
        api.get('/projects'),
        api.get('/nowork'),
      ]);
      setProjects(projRes.data);
      const all = nwRes.data;
      setNWSessions(all.filter(n => n.duration));
      setActiveNW(all.find(n => !n.endTime) || null);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Pre-fill profile form when user loads
  useEffect(() => {
    if (user) {
      setProfile(p => ({ ...p, name: user.name || '', email: user.email || '', phone: user.phone || '' }));
    }
  }, [user]);

  const pending    = projects.filter(p => p.status === 'pending');
  const inProgress = projects.find(p => p.status === 'in_progress');
  const done       = projects.filter(p => p.status === 'done');

  const startWork = async (id) => {
    setAL(id);
    try { await api.patch(`/projects/${id}/start`); await fetchData(); }
    catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setAL(''); }
  };

  const endWork = async (id) => {
    setAL(id);
    try { await api.patch(`/projects/${id}/end`); await fetchData(); }
    catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setAL(''); }
  };

  const startNoWork = async () => {
    setAL('nw');
    try { await api.post('/nowork/start'); await fetchData(); }
    catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setAL(''); }
  };

  const endNoWork = async () => {
    setAL('nw_end');
    try { await api.post('/nowork/end'); await fetchData(); }
    catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setAL(''); }
  };

  const handleProfileUpdate = async e => {
    e.preventDefault();
    setProfileErr('');
    setProfileOk('');
    if (profile.password && profile.password !== profile.confirmPassword) {
      setProfileErr('Passwords do not match');
      return;
    }
    setProfLoading(true);
    try {
      const payload = {
        name:  profile.name,
        email: profile.email,
        phone: profile.phone,
      };
      if (profile.password) payload.password = profile.password;
      await api.patch(`/users/${user.id}/profile`, payload);
      setProfileOk('Profile updated successfully! Changes will reflect on next login.');
      setProfile(p => ({ ...p, password: '', confirmPassword: '' }));
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfLoading(false);
    }
  };

  const totalWork   = projects.filter(p => p.duration).reduce((a, p) => a + p.duration, 0);
  const totalNoWork = noworkSessions.reduce((a, n) => a + n.duration, 0);

  if (loading) return <div className="page-wrap"><Spinner /></div>;

  const TABS = [
    ['work', 'My Work'],
    ['history', 'History'],
    ['profile', '👤 My Profile'],
  ];

  return (
    <div className="page-wrap">
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <div key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── WORK TAB ── */}
      {tab === 'work' && (
        <>
          <div className="metrics metrics-3" style={{ marginBottom: 24 }}>
            <div className="metric">
              <div className="m-label">Pending tasks</div>
              <div className="m-val">{pending.length}</div>
            </div>
            <div className="metric">
              <div className="m-label">Work time</div>
              <div className="m-val" style={{ fontSize: 20 }}>
                {inProgress
                  ? <LiveTimer startTime={inProgress.startTime} className="" />
                  : formatMs(totalWork)}
              </div>
              <div className="m-sub">total logged</div>
            </div>
            <div className="metric">
              <div className="m-label">No-work time</div>
              <div className="m-val" style={{ fontSize: 20 }}>
                {activeNW
                  ? <LiveTimer startTime={activeNW.startTime} className="" />
                  : formatMs(totalNoWork)}
              </div>
              <div className="m-sub">total idle</div>
            </div>
          </div>

          {/* No-work banner: active */}
          {activeNW && (
            <div className="nw-banner active">
              <span style={{ fontSize: 22 }}>☕</span>
              <div style={{ flex: 1 }}>
                <div className="nw-title">No-work session active</div>
                <div className="nw-sub">
                  Elapsed: <LiveTimer startTime={activeNW.startTime} className="" />
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={endNoWork} disabled={actionLoading === 'nw_end'}>
                {actionLoading === 'nw_end' ? '…' : '⏹ End no-work'}
              </button>
            </div>
          )}

          {/* No-work banner: suggest */}
          {!inProgress && !activeNW && pending.length === 0 && (
            <div className="nw-banner warning">
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div className="nw-title">No work assigned right now</div>
                <div className="nw-sub">Log your idle time as a no-work session</div>
              </div>
              <button className="btn btn-warn btn-sm" onClick={startNoWork} disabled={actionLoading === 'nw'}>
                {actionLoading === 'nw' ? '…' : '▶ Start no-work'}
              </button>
            </div>
          )}

          {/* Active project */}
          {inProgress && (
            <>
              <p className="section-title">Currently working on</p>
              <div className="work-item active">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TypeTag type={inProgress.type} />
                  <span className="work-title">{inProgress.title}</span>
                  <StatusBadge status="in_progress" />
                </div>
                <div className="work-meta">
                  Assigned by {inProgress.assignedByName || 'QC'}
                </div>
                <div className="work-actions">
                  <LiveTimer startTime={inProgress.startTime} />
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => endWork(inProgress.id)}
                    disabled={actionLoading === inProgress.id}
                  >
                    {actionLoading === inProgress.id ? '…' : '⏹ End work'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Pending tasks */}
          {pending.length > 0 && (
            <>
              <p className="section-title">Pending tasks ({pending.length})</p>
              {pending.map(p => (
                <div className="work-item" key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <TypeTag type={p.type} />
                    <span className="work-title">{p.title}</span>
                  </div>
                  <div className="work-meta">Assigned by {p.assignedByName || 'QC'}</div>
                  <div className="work-actions">
                    {inProgress
                      ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Finish current task first</span>
                      : <button
                          className="btn btn-success btn-sm"
                          onClick={() => startWork(p.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === p.id ? '…' : '▶ Start work'}
                        </button>}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          <p className="section-title">Completed projects ({done.length})</p>
          <div className="card" style={{ marginBottom: 20 }}>
            {done.length === 0
              ? <Empty icon="🎯" text="No completed projects yet" />
              : done.map(p => (
                  <div className="data-row" key={p.id}>
                    <TypeTag type={p.type} />
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span style={{ fontWeight: 600, color: '#3B6D11', fontSize: 12 }}>{formatMs(p.duration)}</span>
                  </div>
                ))}
          </div>

          <p className="section-title">No-work sessions ({noworkSessions.length})</p>
          <div className="card">
            {noworkSessions.length === 0
              ? <Empty icon="☕" text="No no-work sessions logged" />
              : noworkSessions.map(n => (
                  <div className="data-row" key={n.id}>
                    <span className="ptag pt-nowork">no-work</span>
                    <span style={{ flex: 1 }}>Idle session</span>
                    <span style={{ fontWeight: 600, color: '#555', fontSize: 12 }}>{formatMs(n.duration)}</span>
                  </div>
                ))}
          </div>
        </>
      )}

      {/* ── MY PROFILE TAB ── */}
      {tab === 'profile' && (
        <>
          <p className="section-title">My Profile</p>
          <div className="card" style={{ maxWidth: 600 }}>
            {/* Read-only info block */}
            <div className="profile-info-block" style={{ marginBottom: 24 }}>
              <div className="profile-avatar-wrap">
                <div className="avatar av-dev" style={{ width: 56, height: 56, fontSize: 20 }}>
                  {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    <span className="role-pill">{user?.role}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                User ID: <code style={{ color: 'var(--text-2)', wordBreak: 'break-all' }}>{user?.id}</code>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 13 }}>✏️ Update your details</div>
              {profileErr && <div className="login-error" style={{ marginBottom: 16 }}>{profileErr}</div>}
              {profileOk  && (
                <div style={{ background: 'rgba(142,227,57,0.1)', border: '1px solid rgba(142,227,57,0.25)', color: '#8ee339', borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 16 }}>
                  ✅ {profileOk}
                </div>
              )}
              <form onSubmit={handleProfileUpdate}>
                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input className="form-control" required value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label>Email address</label>
                    <input className="form-control" type="email" required value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label>Phone number</label>
                    <input className="form-control" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 9876543210" />
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>🔒 Change password (leave blank to keep current)</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>New password</label>
                      <input className="form-control" type="password" value={profile.password} onChange={e => setProfile(p => ({ ...p, password: e.target.value }))} placeholder="min 6 characters" />
                    </div>
                    <div className="form-group">
                      <label>Confirm new password</label>
                      <input className="form-control" type="password" value={profile.confirmPassword} onChange={e => setProfile(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="repeat password" />
                    </div>
                  </div>
                </div>
                <button className="btn btn-accent" type="submit" disabled={profLoading}>
                  {profLoading ? 'Saving…' : '💾 Save profile'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
