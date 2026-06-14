import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Avatar, StatusBadge, TypeTag, formatMs, Spinner, Empty, LiveTimer } from '../components/UI';

export default function QCDashboard() {
  const [tab, setTab]       = useState('assign');
  const [devs, setDevs]     = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ title: '', type: 'new', assignedTo: '' });
  const [assigning, setAssigning] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [devStats, setDevStats] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [devsRes, projRes] = await Promise.all([
        api.get('/users?role=developer'),
        api.get('/projects'),
      ]);
      setDevs(devsRes.data);
      setMyProjects(projRes.data);
      if (!form.assignedTo && devsRes.data.length > 0)
        setForm(p => ({ ...p, assignedTo: devsRes.data[0].id }));

      // Fetch stats for each developer
      const stats = {};
      await Promise.all(devsRes.data.map(async d => {
        try {
          const r = await api.get(`/users/${d.id}/stats`);
          stats[d.id] = r.data;
        } catch {}
      }));
      setDevStats(stats);
    } catch {}
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleAssign = async e => {
    e.preventDefault();
    setFormErr('');
    if (!form.title.trim()) { setFormErr('Project title required'); return; }
    setAssigning(true);
    try {
      await api.post('/projects', form);
      setForm(p => ({ ...p, title: '' }));
      fetchData();
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="page-wrap"><Spinner /></div>;

  return (
    <div className="page-wrap">
      <div className="tabs">
        {[['assign','Assign Work'],['assigned','My Assignments'],['devs','Developer Overview']].map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── ASSIGN ── */}
      {tab === 'assign' && (
        <>
          <p className="section-title">Assign a project</p>
          <div className="card" style={{marginBottom:28}}>
            {formErr && <div className="login-error" style={{marginBottom:14}}>{formErr}</div>}
            <form onSubmit={handleAssign}>
              <div className="form-row" style={{marginBottom:14}}>
                <div className="form-group" style={{flex:2}}>
                  <label>Project title</label>
                  <input
                    className="form-control"
                    value={form.title}
                    onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    placeholder="e.g. Dashboard redesign, Bug fix #42…"
                    required
                  />
                </div>
                <div className="form-group" style={{maxWidth: 160}}>
                  <label>Project type</label>
                  <select className="form-control" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    <option value="new">New project</option>
                    <option value="change">Changes</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row" style={{alignItems:'flex-end'}}>
                <div className="form-group">
                  <label>Assign to developer</label>
                  <select className="form-control" value={form.assignedTo} onChange={e => setForm(p => ({...p, assignedTo: e.target.value}))}>
                    {devs.map(d => {
                      const st = devStats[d.id]?.status || 'idle';
                      return <option key={d.id} value={d.id}>{d.name} — {st === 'working' ? '🟢 Working' : st === 'nowork' ? '⚫ No-work' : '🟡 Idle'}</option>;
                    })}
                  </select>
                </div>
                <button className="btn btn-accent" type="submit" disabled={assigning} style={{height:39}}>
                  {assigning ? 'Assigning…' : 'Assign →'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── MY ASSIGNMENTS ── */}
      {tab === 'assigned' && (
        <>
          <p className="section-title">Projects I've assigned ({myProjects.length})</p>
          <div className="card">
            {myProjects.length === 0
              ? <Empty icon="📋" text="No assignments yet — use the Assign Work tab" />
              : myProjects.map(p => (
                  <div className="data-row" key={p.id}>
                    <Avatar name={p.assignedToName || '?'} role="developer" size={24} />
                    <TypeTag type={p.type} />
                    <span style={{flex:1}}>{p.title}</span>
                    <span style={{color:'var(--text-2)',fontSize:12}}>{p.assignedToName}</span>
                    <StatusBadge status={p.status} />
                    {p.duration && <span style={{fontSize:11,color:'var(--text-3)'}}>{formatMs(p.duration)}</span>}
                  </div>
                ))}
          </div>
        </>
      )}

      {/* ── DEVELOPER OVERVIEW ── */}
      {tab === 'devs' && (
        <>
          <p className="section-title">All developers</p>
          <div className="dev-grid">
            {devs.map(d => {
              const stats = devStats[d.id] || {};
              const active = stats.projects?.find(p => p.status === 'in_progress');
              const pending = stats.projects?.filter(p => p.status === 'pending') || [];
              return (
                <div className="dev-card" key={d.id}>
                  <div className="dev-header">
                    <Avatar name={d.name} role="developer" />
                    <div style={{flex:1}}>
                      <div className="dev-name">{d.name}</div>
                      <div className="dev-role">{pending.length} pending task{pending.length !== 1 ? 's' : ''}</div>
                    </div>
                    <StatusBadge status={stats.status || 'idle'} />
                  </div>
                  {active
                    ? <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                        <TypeTag type={active.type} />
                        <span style={{flex:1}}>{active.title}</span>
                        <LiveTimer startTime={active.startTime} className="badge b-progress" />
                      </div>
                    : <div style={{fontSize:12,color:'var(--text-3)'}}>No active task</div>}
                  <div className="dev-stats">
                    <span>⏱ Work: <b>{formatMs(stats.totalWorkMs||0)}</b></span>
                    <span>☕ No-work: <b>{formatMs(stats.totalNoWorkMs||0)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
