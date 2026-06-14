import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if      (user.role === 'admin')     navigate('/admin');
      else if (user.role === 'qc')        navigate('/qc');
      else                                navigate('/dev');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo-wrap">
          <img src="/logo.png" alt="A2Z Technologies" />
          <div className="login-logo-text">
            <div className="login-logo-name"><span>a2z</span> technologies</div>
            <div className="login-logo-tag">design • develop</div>
          </div>
        </div>
        <div className="login-sub">Sign in to your workspace</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-control"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-accent"
            type="submit"
            disabled={loading}
            style={{ marginTop: 6, justifyContent: 'center', padding: '10px' }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div style={{ marginTop: 24, padding: 14, background: '#F0F2F8', borderRadius: 8, fontSize: 12, color: '#4A4E7A', border: '0.5px solid rgba(30,38,112,0.15)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Demo accounts</div>
          <div>Admin: admin@pf.com / admin123</div>
          <div>QC: priya@pf.com / qc123</div>
          <div>Dev: arun@pf.com / dev123</div>
        </div>
      </div>
    </div>
  );
}
