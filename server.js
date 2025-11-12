const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebRTC signaling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    
    socket.join(roomId);
    socket.roomId = roomId;

    // Notify others in the room
    socket.to(roomId).emit('user-connected', socket.id);

    // Send list of existing users
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const users = Array.from(room).filter(id => id !== socket.id);
      socket.emit('users-in-room', users);
    }
  });

  // Forward WebRTC signals
  socket.on('webrtc-signal', (data) => {
    socket.to(data.target).emit('webrtc-signal', {
      sender: socket.id,
      signal: data.signal
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-disconnected', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});