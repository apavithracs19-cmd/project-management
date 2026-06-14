import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Avatar, StatusBadge, TypeTag, formatMs, Spinner, Empty, LiveTimer } from '../components/UI';

export default function AdminDashboard() {
  const [tab, setTab]       = useState('overview');
  const [data, setData]     = useState(null);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'developer' });
  const [addErr, setAddErr] = useState('');

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
    const id = setInterval(fetchSummary, 5000); // poll every 5s
    return () => clearInterval(id);
  }, [fetchSummary, fetchUsers]);

  const handleAddUser = async e => {
    e.preventDefault();
    setAddErr('');
    try {
      await api.post('/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'developer' });
      setShowAddUser(false);
      fetchUsers();
    } catch (err) {
      setAddErr(err.response?.data?.error || 'Failed to add user');
    }
  };

  if (loading) return <div className="page-wrap"><Spinner /></div>;

  const { devStats = [], totalDone = 0, totalPending = 0, totalActive = 0, recentActivity = [] } = data || {};
  const working = devStats.filter(d => d.status === 'working').length;
  const idle    = devStats.filter(d => d.status === 'idle').length;
  const nowork  = devStats.filter(d => d.status === 'nowork').length;

  return (
    <div className="page-wrap">
      <div className="tabs">
        {[['overview','Overview'],['developers','Developers'],['history','History'],['users','Manage Users']].map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <div className="metrics metrics-4">
            <div className="metric">
              <div className="m-label">Working now</div>
              <div className="m-val" style={{color:'#3B6D11'}}>{working}</div>
              <div className="m-sub">developers active</div>
            </div>
            <div className="metric">
              <div className="m-label">Idle</div>
              <div className="m-val" style={{color:'#854F0B'}}>{idle}</div>
              <div className="m-sub">no active task</div>
            </div>
            <div className="metric">
              <div className="m-label">No-work logged</div>
              <div className="m-val" style={{color:'#555'}}>{nowork}</div>
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
                  <div style={{flex:1}}>
                    <div className="dev-name">{u.name}</div>
                    <div className="dev-role">{pendingCount} pending task{pendingCount !== 1 ? 's' : ''}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                {activeProject
                  ? <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                      <TypeTag type={activeProject.type} />
                      <span style={{flex:1}}>{activeProject.title}</span>
                      <LiveTimer startTime={activeProject.startTime} className="badge b-progress" />
                    </div>
                  : <div style={{fontSize:12,color:'var(--text-3)'}}>No active task</div>}
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
            <div className="card" key={u.id} style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <Avatar name={u.name} role="developer" size={38} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{u.name}</div>
                  <div style={{fontSize:12,color:'var(--text-2)',marginTop:2}}>
                    Work: <b>{formatMs(totalWorkMs)}</b> &nbsp;|&nbsp; No-work: <b>{formatMs(totalNoWorkMs)}</b>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              {projects.length === 0
                ? <div style={{fontSize:12,color:'var(--text-3)'}}>No projects assigned</div>
                : projects.map(p => (
                    <div className="data-row" key={p.id}>
                      <TypeTag type={p.type} />
                      <span style={{flex:1}}>{p.title}</span>
                      <StatusBadge status={p.status} />
                      <span style={{fontSize:11,color:'var(--text-3)',minWidth:50,textAlign:'right'}}>
                        {p.duration ? formatMs(p.duration) : p.status==='in_progress' ? <LiveTimer startTime={p.startTime} className="" /> : '—'}
                      </span>
                    </div>
                  ))}
              {noworkSessions.length > 0 && (
                <div style={{marginTop:10,fontSize:11,color:'var(--text-3)'}}>
                  No-work sessions: {noworkSessions.length} (Total: {formatMs(noworkSessions.reduce((a,n)=>a+n.duration,0))})
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
                      ? <><TypeTag type={item.type} /><span style={{flex:1}}>{item.title}</span><span style={{color:'var(--text-2)',fontSize:12}}>{item.assignedToName}</span></>
                      : <><span className="ptag pt-nowork">no-work</span><span style={{flex:1}}>Idle session</span><span style={{color:'var(--text-2)',fontSize:12}}>{item.devName}</span></>}
                    <span style={{fontWeight:600,color: item._kind==='project' ? '#3B6D11' : '#555', fontSize:12, minWidth:50, textAlign:'right'}}>
                      {formatMs(item.duration)}
                    </span>
                  </div>
                ))}
          </div>
        </>
      )}

      {/* ── MANAGE USERS ── */}
      {tab === 'users' && (
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <p className="section-title" style={{marginBottom:0}}>All users</p>
            <button className="btn btn-accent btn-sm" onClick={() => setShowAddUser(v => !v)}>
              {showAddUser ? 'Cancel' : '+ Add user'}
            </button>
          </div>

          {showAddUser && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontWeight:600,marginBottom:14}}>New user</div>
              {addErr && <div className="login-error">{addErr}</div>}
              <form onSubmit={handleAddUser}>
                <div className="form-row" style={{marginBottom:12}}>
                  <div className="form-group">
                    <label>Full name</label>
                    <input className="form-control" required value={newUser.name} onChange={e => setNewUser(p=>({...p,name:e.target.value}))} placeholder="e.g. Anand Kumar" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" required value={newUser.email} onChange={e => setNewUser(p=>({...p,email:e.target.value}))} placeholder="anand@pf.com" />
                  </div>
                </div>
                <div className="form-row" style={{marginBottom:16}}>
                  <div className="form-group">
                    <label>Password</label>
                    <input className="form-control" type="password" required value={newUser.password} onChange={e => setNewUser(p=>({...p,password:e.target.value}))} placeholder="min 6 chars" />
                  </div>
                  <div className="form-group" style={{maxWidth:160}}>
                    <label>Role</label>
                    <select className="form-control" value={newUser.role} onChange={e => setNewUser(p=>({...p,role:e.target.value}))}>
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

          <div className="card">
            {users.map((u, i) => (
              <div className="data-row" key={u.id} style={i===0?{paddingTop:0}:{}}>
                <Avatar name={u.name} role={u.role} size={32} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:500}}>{u.name}</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>{u.email}</div>
                </div>
                <span className="role-pill">{u.role}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
