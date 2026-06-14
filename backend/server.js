/**
 * ProjectFlow Backend
 * Express + JWT Auth — In-Memory Database
 * 
 * Roles: admin | qc | developer
 * 
 * Run: npm install && node server.js
 */

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'projectflow_secret_key_change_in_production';

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════
//  IN-MEMORY DATABASE
// ═══════════════════════════════════════════════
const DB = {
  users: [],
  projects: [],
  noworkSessions: [],
  timeLogs: [],
};

// Seed default users
async function seedUsers() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  DB.users = [
    { id: uuidv4(), name: 'Rajan',   email: 'admin@pf.com',   password: hash('admin123'),  role: 'admin',     avatar: 'RA', createdAt: Date.now() },
    { id: uuidv4(), name: 'Priya',   email: 'priya@pf.com',   password: hash('qc123'),     role: 'qc',        avatar: 'PR', createdAt: Date.now() },
    { id: uuidv4(), name: 'Suresh',  email: 'suresh@pf.com',  password: hash('qc123'),     role: 'qc',        avatar: 'SU', createdAt: Date.now() },
    { id: uuidv4(), name: 'Arun',    email: 'arun@pf.com',    password: hash('dev123'),    role: 'developer', avatar: 'AR', createdAt: Date.now() },
    { id: uuidv4(), name: 'Deepa',   email: 'deepa@pf.com',   password: hash('dev123'),    role: 'developer', avatar: 'DE', createdAt: Date.now() },
    { id: uuidv4(), name: 'Karthik', email: 'karthik@pf.com', password: hash('dev123'),    role: 'developer', avatar: 'KA', createdAt: Date.now() },
    { id: uuidv4(), name: 'Meena',   email: 'meena@pf.com',   password: hash('dev123'),    role: 'developer', avatar: 'ME', createdAt: Date.now() },
  ];
  console.log('✅ Default users seeded');
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

function getDevStatus(devId) {
  const active = DB.projects.find(p => p.assignedTo === devId && p.status === 'in_progress');
  if (active) return 'working';
  const nw = DB.noworkSessions.find(n => n.devId === devId && !n.endTime);
  if (nw) return 'nowork';
  return 'idle';
}

function getTotalWorkMs(devId) {
  return DB.projects
    .filter(p => p.assignedTo === devId && p.duration)
    .reduce((a, p) => a + p.duration, 0);
}

function getTotalNoWorkMs(devId) {
  return DB.noworkSessions
    .filter(n => n.devId === devId && n.duration)
    .reduce((a, n) => a + n.duration, 0);
}

// ═══════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════════════
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ═══════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const user = DB.users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: safeUser(user) });
});

// GET /api/auth/me
app.get('/api/auth/me', auth, (req, res) => {
  const user = DB.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// ═══════════════════════════════════════════════
//  USER ROUTES
// ═══════════════════════════════════════════════

// GET /api/users — admin/qc can list all users
app.get('/api/users', auth, requireRole('admin', 'qc'), (req, res) => {
  const { role } = req.query;
  let users = DB.users.map(safeUser);
  if (role) users = users.filter(u => u.role === role);
  res.json(users);
});

// GET /api/users/:id/stats
app.get('/api/users/:id/stats', auth, (req, res) => {
  const { id } = req.params;
  // Developer can only see own stats
  if (req.user.role === 'developer' && req.user.id !== id)
    return res.status(403).json({ error: 'Forbidden' });

  const user = DB.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const projects   = DB.projects.filter(p => p.assignedTo === id);
  const nwSessions = DB.noworkSessions.filter(n => n.devId === id && n.duration);

  res.json({
    user: safeUser(user),
    status:        getDevStatus(id),
    totalWorkMs:   getTotalWorkMs(id),
    totalNoWorkMs: getTotalNoWorkMs(id),
    projects,
    noworkSessions: nwSessions,
  });
});

// POST /api/users — admin can create new users
app.post('/api/users', auth, requireRole('admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'All fields required' });
  if (!['admin','qc','developer'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (DB.users.find(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: 'Email already exists' });

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const user = {
    id:        uuidv4(),
    name,
    email:     email.toLowerCase(),
    password:  bcrypt.hashSync(password, 10),
    role,
    avatar:    initials,
    createdAt: Date.now(),
  };
  DB.users.push(user);
  res.status(201).json(safeUser(user));
});

// ═══════════════════════════════════════════════
//  PROJECT ROUTES
// ═══════════════════════════════════════════════

// GET /api/projects
app.get('/api/projects', auth, (req, res) => {
  let projects = DB.projects;

  if (req.user.role === 'developer')
    projects = projects.filter(p => p.assignedTo === req.user.id);

  if (req.query.assignedTo) projects = projects.filter(p => p.assignedTo === req.query.assignedTo);
  if (req.query.status)     projects = projects.filter(p => p.status === req.query.status);

  // Enrich with user names
  const enriched = projects.map(p => ({
    ...p,
    assignedToName: DB.users.find(u => u.id === p.assignedTo)?.name,
    assignedByName: DB.users.find(u => u.id === p.assignedBy)?.name,
  }));

  res.json(enriched);
});

// POST /api/projects — QC or Admin assigns a project
app.post('/api/projects', auth, requireRole('admin', 'qc'), (req, res) => {
  const { title, type, assignedTo } = req.body;
  if (!title || !type || !assignedTo)
    return res.status(400).json({ error: 'title, type, assignedTo required' });
  if (!['new','change','other'].includes(type))
    return res.status(400).json({ error: 'type must be new | change | other' });

  const dev = DB.users.find(u => u.id === assignedTo && u.role === 'developer');
  if (!dev) return res.status(404).json({ error: 'Developer not found' });

  const project = {
    id:         uuidv4(),
    title,
    type,
    assignedTo,
    assignedBy: req.user.id,
    status:     'pending',
    startTime:  null,
    endTime:    null,
    duration:   null,
    createdAt:  Date.now(),
  };
  DB.projects.push(project);
  res.status(201).json(project);
});

// PATCH /api/projects/:id/start — Developer starts work
app.patch('/api/projects/:id/start', auth, requireRole('developer'), (req, res) => {
  const project = DB.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.assignedTo !== req.user.id)
    return res.status(403).json({ error: 'Not your project' });
  if (project.status !== 'pending')
    return res.status(400).json({ error: 'Project is not pending' });

  // Only one active project at a time
  const active = DB.projects.find(p => p.assignedTo === req.user.id && p.status === 'in_progress');
  if (active) return res.status(400).json({ error: 'Finish your current task first' });

  // Auto-end any active no-work session
  const nw = DB.noworkSessions.find(n => n.devId === req.user.id && !n.endTime);
  if (nw) { nw.endTime = Date.now(); nw.duration = nw.endTime - nw.startTime; }

  project.status    = 'in_progress';
  project.startTime = Date.now();
  res.json(project);
});

// PATCH /api/projects/:id/end — Developer ends work
app.patch('/api/projects/:id/end', auth, requireRole('developer'), (req, res) => {
  const project = DB.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.assignedTo !== req.user.id)
    return res.status(403).json({ error: 'Not your project' });
  if (project.status !== 'in_progress')
    return res.status(400).json({ error: 'Project is not in progress' });

  project.status   = 'done';
  project.endTime  = Date.now();
  project.duration = project.endTime - project.startTime;
  res.json(project);
});

// ═══════════════════════════════════════════════
//  NO-WORK SESSION ROUTES
// ═══════════════════════════════════════════════

// GET /api/nowork — list sessions
app.get('/api/nowork', auth, (req, res) => {
  let sessions = DB.noworkSessions;
  if (req.user.role === 'developer')
    sessions = sessions.filter(n => n.devId === req.user.id);
  res.json(sessions);
});

// POST /api/nowork/start
app.post('/api/nowork/start', auth, requireRole('developer'), (req, res) => {
  const existing = DB.noworkSessions.find(n => n.devId === req.user.id && !n.endTime);
  if (existing) return res.status(400).json({ error: 'No-work session already active' });

  const active = DB.projects.find(p => p.assignedTo === req.user.id && p.status === 'in_progress');
  if (active) return res.status(400).json({ error: 'You have an active project running' });

  const session = {
    id:        uuidv4(),
    devId:     req.user.id,
    startTime: Date.now(),
    endTime:   null,
    duration:  null,
  };
  DB.noworkSessions.push(session);
  res.status(201).json(session);
});

// POST /api/nowork/end
app.post('/api/nowork/end', auth, requireRole('developer'), (req, res) => {
  const session = DB.noworkSessions.find(n => n.devId === req.user.id && !n.endTime);
  if (!session) return res.status(404).json({ error: 'No active no-work session' });
  session.endTime  = Date.now();
  session.duration = session.endTime - session.startTime;
  res.json(session);
});

// ═══════════════════════════════════════════════
//  ADMIN DASHBOARD SUMMARY
// ═══════════════════════════════════════════════
app.get('/api/admin/summary', auth, requireRole('admin'), (req, res) => {
  const developers = DB.users.filter(u => u.role === 'developer');
  const devStats = developers.map(d => ({
    user:          safeUser(d),
    status:        getDevStatus(d.id),
    totalWorkMs:   getTotalWorkMs(d.id),
    totalNoWorkMs: getTotalNoWorkMs(d.id),
    activeProject: DB.projects.find(p => p.assignedTo === d.id && p.status === 'in_progress') || null,
    pendingCount:  DB.projects.filter(p => p.assignedTo === d.id && p.status === 'pending').length,
    doneCount:     DB.projects.filter(p => p.assignedTo === d.id && p.status === 'done').length,
  }));

  res.json({
    devStats,
    totalDone:    DB.projects.filter(p => p.status === 'done').length,
    totalPending: DB.projects.filter(p => p.status === 'pending').length,
    totalActive:  DB.projects.filter(p => p.status === 'in_progress').length,
    recentActivity: [
      ...DB.projects.filter(p => p.status === 'done').map(p => ({
        ...p,
        _kind: 'project',
        assignedToName: DB.users.find(u => u.id === p.assignedTo)?.name,
      })),
      ...DB.noworkSessions.filter(n => n.duration).map(n => ({
        ...n,
        _kind: 'nowork',
        devName: DB.users.find(u => u.id === n.devId)?.name,
      })),
    ].sort((a, b) => (b.endTime || 0) - (a.endTime || 0)).slice(0, 50),
  });
});

// ═══════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// ═══════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════
seedUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 ProjectFlow API running at http://localhost:${PORT}`);
    console.log('\nDefault login credentials:');
    console.log('  Admin    → admin@pf.com   / admin123');
    console.log('  QC       → priya@pf.com   / qc123');
    console.log('  QC       → suresh@pf.com  / qc123');
    console.log('  Dev Arun → arun@pf.com    / dev123');
    console.log('  Dev Deepa→ deepa@pf.com   / dev123');
    console.log('  Dev Karthik→ karthik@pf.com / dev123');
    console.log('  Dev Meena→ meena@pf.com   / dev123\n');
  });
});
