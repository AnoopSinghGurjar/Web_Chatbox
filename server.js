const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Message = require("./models/Message");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_secure_value";

if (!MONGO_URI) {
  console.warn("Warning: MONGO_URI not set. Create a .env with MONGO_URI to enable persistence.");
}

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set. Using default insecure secret. Set JWT_SECRET in .env for production.');
}

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { connectTimeoutMS: 10000 })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.warn("MongoDB connection warning:", err.message));

// REST API to fetch messages
app.get("/api/messages", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const messages = await Message.find({}).sort({ createdAt: 1 }).limit(limit).lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: signup
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash: hash });
    await user.save();
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API to post a message (useful for debugging or other clients)
app.post("/api/messages", async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: "user and text required" });
    const msg = new Message({ user, text });
    await msg.save();
    io.emit("chatMessage", msg);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on("connection", (socket) => {
  // try to identify user from token (client may send auth token in handshake)
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userName = decoded.username;
    }
  } catch (e) {
    socket.userName = null;
  }

  console.log("A user connected", socket.id, 'user=', socket.userName || 'Anonymous');

  socket.broadcast.emit("chatMessage", { system: true, text: "🔵 A user joined the chat" });

  socket.on("chatMessage", async (msgData) => {
    try {
      // Determine sender
      const sender = socket.userName || msgData.user || "Anonymous";
      const payload = {
        user: sender,
        text: msgData.text || "",
      };

      const message = new Message(payload);
      await message.save();
      io.emit("chatMessage", message);

      // Bot reply (simple keyword-based)
      if (payload.user !== 'Bot 🤖') {
        const lower = payload.text.toLowerCase();
        let reply = null;
        if (lower.includes('hello')) reply = `Hi ${sender}! 👋 How can I help you today?`;
        else if (lower.includes('how are you')) reply = "I'm a bot, but I'm doing great! 😄";
        else if (lower.includes('bye')) reply = "Goodbye! Have a great day 🌞";
        else if (lower.includes('time')) reply = `⏰ The current time is ${new Date().toLocaleTimeString()}`;
        else if (lower.includes('help')) reply = "You can say 'hello', ask for 'time', or try 'help'.";
        else reply = null;

        if (reply) {
          setTimeout(async () => {
            try {
              const botMsg = new Message({ user: 'Bot 🤖', text: reply });
              await botMsg.save();
              io.emit('chatMessage', botMsg);
            } catch (e) { console.error('Bot save failed', e.message); }
          }, 700);
        }
      }
    } catch (err) {
      console.error("Failed to save message:", err.message);
    }
  });

  // typing indicator from clients
  socket.on('typing', (user) => {
    socket.broadcast.emit('typing', { user });
  });

  socket.on('stopTyping', (user) => {
    socket.broadcast.emit('stopTyping', { user });
  });

  socket.on("disconnect", () => {
    io.emit("chatMessage", { system: true, text: "🔴 A user left the chat" });
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));