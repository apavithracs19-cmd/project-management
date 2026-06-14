import React from 'react';

// ── Avatar
export function Avatar({ name = '', role = 'dev', size = 30 }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const cls = role === 'admin' ? 'av-admin' : role === 'qc' ? 'av-qc' : 'av-dev';
  return (
    <div className={`avatar ${cls}`} style={{ width: size, height: size, fontSize: size * 0.37 }}>
      {initials}
    </div>
  );
}

// ── Status badge
export function StatusBadge({ status }) {
  const map = {
    working:     ['b-working', 'Working'],
    idle:        ['b-idle',    'Idle'],
    nowork:      ['b-nowork',  'No-work'],
    done:        ['b-done',    'Done'],
    pending:     ['b-pending', 'Pending'],
    in_progress: ['b-progress','In Progress'],
  };
  const [cls, label] = map[status] || ['b-idle', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Project type tag
export function TypeTag({ type }) {
  return <span className={`ptag pt-${type}`}>{type}</span>;
}

// ── Duration formatter
export function formatMs(ms) {
  if (!ms || ms < 0) return '0s';
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Spinner
export function Spinner() {
  return <div className="spinner" />;
}

// ── Empty state
export function Empty({ icon = '📭', text = 'Nothing here yet' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{text}</div>
    </div>
  );
}

// ── Live elapsed timer (ticks every second)
export function LiveTimer({ startTime, className = 'elapsed' }) {
  const [elapsed, setElapsed] = React.useState(Date.now() - startTime);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className={className}>{formatMs(elapsed)}</span>;
}
