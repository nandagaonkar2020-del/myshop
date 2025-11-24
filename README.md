# Admin Panel (All-in-one)

## Quick start

1. Copy project to your machine.
2. Create `.env` from `.env.example` and fill values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create `uploads/` folder in project root (server will create automatically too).
5. Start server:
   ```bash
   node server.js
   ```
6. Open `http://localhost:5000` in browser.

## Default admin
Set ADMIN_EMAIL and ADMIN_PASSWORD in `.env`. On first run server seeds admin.

## Notes
- Frontend stores JWT token in localStorage.
- API expects `Authorization: Bearer <token>` header.
