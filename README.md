# Workbench

```
workbench/
├── frontend/   React + Vite + Tailwind   http://localhost:5173
├── backend/    Express + Socket.IO API   http://localhost:5000
└── docker-compose.yml   (optional local MongoDB)
```

## Run locally (no database setup needed)

Two terminals. You need Node.js 20 or newer.

```bash
# Terminal 1 - backend
cd backend
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev

# Terminal 2 - frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Create an account**.
The database starts empty. The account you create becomes the owner of its own workspace.
Data is saved in `backend/data/workbench-db.json`.

## Use MongoDB instead (optional)

Open `backend/.env`, remove the `#` in front of `MONGODB_URI`, and restart the backend.
The terminal shows `[Storage] Using MongoDB (...)` when it is active.

| Where MongoDB runs | MONGODB_URI |
|---|---|
| Installed on your PC | `mongodb://127.0.0.1:27017/workbench` |
| Docker (`docker compose up -d`) | `mongodb://127.0.0.1:27017/workbench` |
| MongoDB Atlas (cloud) | `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/workbench` |

Notes:
- Collections are created automatically. Nothing to import.
- If `MONGODB_URI` is set but MongoDB is not running, the backend stops and tells you so.
  Either start MongoDB, or comment the line out to go back to the local file.
- Data in the local file and in MongoDB is separate. Switching does not copy data.
- Atlas: add your IP address under Network Access, and use a database user with read/write access.

## Check that everything works

With the backend running on an empty database:

```bash
cd backend
npm run smoke     # 37 checks: login, projects, tasks, comments, releases, invites, roles, workspace isolation
npm test          # unit tests for permissions, dependencies and validation
```

## How login works

- Passwords are hashed with bcrypt and stored separately from user records.
- Login sets an httpOnly cookie (`wb_token`, 7 days). Browser JavaScript cannot read it.
- Every API call and every live (Socket.IO) connection is checked against that cookie.
- A user can only see and change workspaces they are a member of.
- Login and register are rate limited.

## Production

- Backend: set `NODE_ENV=production`, `JWT_SECRET` (required), `CLIENT_URL` and `MONGODB_URI`.
- Frontend: build with `npm run build` and host the `dist` folder.
  If the frontend and backend are on different domains, set `VITE_API_URL` to the backend URL
  before building. Both sites must use HTTPS because the login cookie is then `Secure; SameSite=None`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not open MongoDB` on start | MongoDB is not running. Start it, or comment out `MONGODB_URI` in `backend/.env`. |
| Page shows the login screen again and again | Backend is not running on port 5000. Start `npm run dev` in `backend`. |
| `EADDRINUSE` on start | Port 5000 or 5173 is used by another program. Change `PORT` in `backend/.env`. |
| Project key error | Use English capital letters and numbers (for example `CORE`). Tamil names are fine; the key is suggested for you. |
