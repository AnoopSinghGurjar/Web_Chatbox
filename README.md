# Web Chat

This project is a small real-time chat app with a polished front-end and a Node.js backend that can persist messages to MongoDB.

What I changed and added
- Backend: `server.js` now uses `express`, `socket.io`, and `mongoose`.
- Message persistence: `models/Message.js` stores messages in MongoDB.
- API: `GET /api/messages` and `POST /api/messages` are available.
- Frontend: `public/index.html` now connects to the server via socket.io and loads message history.
- Environment: `.env.example` provided. `.env` can contain your `MONGO_URI` and `JWT_SECRET`.
- Authentication: signup and login endpoints added; frontend supports sign in / sign up.

Quick start (Windows PowerShell)

1. Copy `.env.example` to `.env` and update `MONGO_URI` (for local MongoDB, use `mongodb://localhost:27017/webchat`):

```powershell
copy .env.example .env
# then edit .env in your editor to set the MONGO_URI
```

2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open `http://localhost:4000` in your browser.

Notes
- If you do not set `MONGO_URI`, the server will still run but messages won't persist.
- To run with live reload during development, install `nodemon` globally or as a dev dependency and use it to run `server.js`.

If you want, I can:
- Add user list / typing indicators.
- Add message deletion or edit operations.
- Add authentication.
