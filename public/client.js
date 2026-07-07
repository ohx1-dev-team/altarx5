const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000
});

let roomCode = '';
let userName = '';

/* =========================
   SOCKET CONNECTION EVENTS
========================= */

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // Auto rejoin room after reconnect
  if (roomCode && userName) {
    socket.emit("joinRoom", { code: roomCode, name: userName }, (res) => {
      if (res.success) {
        console.log("Rejoined room successfully");
      } else {
        console.log("Rejoin failed:", res.message);
      }
    });
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

/* =========================
   CREATE ROOM
========================= */

document.getElementById('createBtn').onclick = () => {
  const name = document.getElementById('name').value.trim();
  if (!name) return alert("Please enter your name before creating a room.");

  userName = name;

  socket.emit('createRoom', name, (code) => {
    roomCode = code;
    showChat(code);
    document.getElementById('info').innerText = 'Room created: ' + code;
  });
};

/* =========================
   JOIN ROOM
========================= */

document.getElementById('joinBtn').onclick = () => {
  const name = document.getElementById('name').value.trim();
  const code = document.getElementById('code').value.trim();

  if (!name) return alert("Please enter your name.");
  if (!code) return alert("Please enter a room code.");

  userName = name;

  socket.emit('joinRoom', { code, name }, (res) => {
    if (res.success) {
      roomCode = code;
      showChat(code);
    } else if (res.message === "Room full") {
      alert("This Room already has 3 people. You cannot join.");
    } else if (res.message === "Room not found!") {
      alert("Room not found. Check the code.");
    } else {
      alert(res.message);
    }
  });
};

/* =========================
   SEND MESSAGE
========================= */

document.getElementById('sendBtn').onclick = sendMessage;

document.getElementById('message').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const msgInput = document.getElementById('message');
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit('sendMessage', {
    code: roomCode,
    name: userName,
    message: msg
  });

  msgInput.value = '';
}

/* =========================
   RECEIVE MESSAGES
========================= */

socket.on('loadMessages', (messages) => {
  const chat = document.getElementById('chat');
  chat.innerHTML = '';
  messages.forEach(msg => addMessageToScreen(msg));
});

socket.on('newMessage', (msg) => {
  addMessageToScreen(msg);
});

socket.on('systemMessage', (text) => {
  const chat = document.getElementById('chat');
  const sysDiv = document.createElement('div');
  sysDiv.classList.add('system-message');
  sysDiv.textContent = text;
  chat.appendChild(sysDiv);
  chat.scrollTop = chat.scrollHeight;
});

/* =========================
   MESSAGE RENDERING
========================= */

function addMessageToScreen(msg) {
  const chat = document.getElementById('chat');

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');

  if (msg.name === userName) {
    msgDiv.classList.add('self');
  }

  msgDiv.textContent = `${msg.name} [${msg.time}]: ${msg.message}`;

  chat.appendChild(msgDiv);

  // Keep only last 50 messages
  while (chat.children.length > 50) {
    chat.removeChild(chat.firstChild);
  }

  chat.scrollTop = chat.scrollHeight;
}

/* =========================
   SCREEN SWITCHING
========================= */

function showChat(code) {
  document.getElementById('joinScreen').style.display = 'none';
  document.getElementById('chatScreen').style.display = 'flex';
  document.getElementById('roomCodeDisplay').innerText = code;
}