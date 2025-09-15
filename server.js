const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  // notify others
  socket.broadcast.emit("chatMessage", { system: true, text: "🔵 A user joined the chat" });

  // chat message
  socket.on("chatMessage", (msgData) => {
    io.emit("chatMessage", msgData);
  });

  // user disconnect
  socket.on("disconnect", () => {
    io.emit("chatMessage", { system: true, text: "🔴 A user left the chat" });
  });
});

server.listen(4000, () => console.log("Server running on http://localhost:4000"));