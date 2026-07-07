const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(bodyParser.json());

/* ======================
STATIC FILES
====================== */
app.use(express.static("public"));

/* ======================
CHAT ROOM SYSTEM
====================== */
const rooms = {};

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(99999 + Math.random() * 999999).toString(); //code generation needs to be improved!!!!
  } while (rooms[code]);
  return code;
}

/* ======================
SOCKET.IO
====================== */
io.on("connection", (socket) => {
  let currentRoom = null;

  socket.on("createRoom", (name, callback) => {
    const code = generateRoomCode();

    rooms[code] = {
      users: [{ id: socket.id, name }],
      messages: []
    };

    socket.join(code);
    currentRoom = code;

    callback(code);
  });

  socket.on("joinRoom", ({ code, name }, callback) => {
    const room = rooms[code];
    if (!room) return callback({ success: false, message: "Room not found" });
    if (room.users.length >= 3) return callback({ success: false, message: "Room full" });

    room.users.push({ id: socket.id, name });
    socket.join(code);
    currentRoom = code;

    callback({ success: true });

    const last50 = room.messages.slice(-50);
    socket.emit("loadMessages", last50);

    io.to(code).emit("systemMessage", name + " joined " + code);
  });

  socket.on("sendMessage", ({ code, name, message }) => {
    const room = rooms[code];
    if (!room) return;

 const msg = {
  name,
  message,
  // Example: Force display to 'America/New_York' regardless of server location
  time: new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Los_Angeles' // Replace with desired IANA timezone
  })
};

    room.messages.push(msg);
    io.to(code).emit("newMessage", msg);
  });

  socket.on("disconnecting", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users = rooms[currentRoom].users.filter(u => u.id !== socket.id);
      if (rooms[currentRoom].users.length === 0) delete rooms[currentRoom];
    }
  });
});

/* ======================
START SERVER
====================== */
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on port", PORT);
});