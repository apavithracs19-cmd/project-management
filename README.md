# ProjectFlow – Setup Guide

## Folder Structure
```
projectflow/
├── backend/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── package.json
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js
        ├── api/
        │   └── client.js
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   ├── Topbar.js
        │   └── UI.js
        └── pages/
            ├── Login.js
            ├── AdminDashboard.js
            ├── QCDashboard.js
            └── DevDashboard.js
```

---

## Step 1 – Start Backend

```bash
cd backend
npm install
node server.js
# API runs at http://localhost:5000
```

## Step 2 – Start Frontend

```bash
cd frontend
npm install
npm start
# App opens at http://localhost:3000
```

---

## Default Login Credentials

| Role      | Email             | Password  |
|-----------|-------------------|-----------|
| Admin     | admin@pf.com      | admin123  |
| QC        | priya@pf.com      | qc123     |
| QC        | suresh@pf.com     | qc123     |
| Developer | arun@pf.com       | dev123    |
| Developer | deepa@pf.com      | dev123    |
| Developer | karthik@pf.com    | dev123    |
| Developer | meena@pf.com      | dev123    |

---

## Features

### Admin
- Overview: who is working, idle, no-work (live updates every 5s)
- Developer detail breakdown with time stats
- Full history of all completed projects + no-work sessions
- Manage Users: view all users, add new users

### QC
- Assign projects to developers (New / Changes / Other)
- View all my assignments and their status
- Developer overview with live status

### Developer
- See pending tasks, start/end work with timer
- No-work session tracking
- History of completed projects + no-work sessions

---

## Production Notes
- Replace JWT_SECRET in server.js with a strong random string
- Use a real database (PostgreSQL / MongoDB) instead of in-memory
- Add HTTPS
- Build frontend: `npm run build` then serve the `build/` folder
