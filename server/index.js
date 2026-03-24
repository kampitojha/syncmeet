require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3001;

// Multi-Room Mesh State Management
// Structure: RoomID -> Set of { socketId, userId, userName }
const roomRegistry = new Map();

io.on('connection', (socket) => {
  console.log(`[NETWORK] Node established: ${socket.id}`);

  socket.on('join-room', (roomId, userId, userName) => {
    if (!roomId) return;
    
    // Join socket.io room for logical grouping
    socket.join(roomId);
    
    // Initialize room registry if new
    if (!roomRegistry.has(roomId)) {
      roomRegistry.set(roomId, new Set());
    }

    const userData = { socketId: socket.id, userId, userName };
    roomRegistry.get(roomId).add(userData);

    // 1. Tell the new user about ALL existing users in the room
    const existingUsers = Array.from(roomRegistry.get(roomId))
      .filter(u => u.socketId !== socket.id);
    
    socket.emit('mesh-manifest', existingUsers);

    // 2. Notify all existing users in the room about the new participant
    socket.to(roomId).emit('user-entered-mesh', userData);

    console.log(`[ROUTING] User ${userName} (${userId}) joined room ${roomId}. Mesh size: ${roomRegistry.get(roomId).size}`);
  });

  // Signaling Relay Engine (The Core of the Mesh)
  // This allows peers to exchange SDP and ICE candidates
  socket.on('signal', ({ toSocketId, signal, fromUid, fromName }) => {
    // Precise relay to the target peer
    io.to(toSocketId).emit('signal', {
      fromSocketId: socket.id,
      fromUid,
      fromName,
      signal
    });
  });

  // Global Room Broadcasts (Chat, Reactions, Polls)
  socket.on('broadcast-action', (roomId, actionPayload) => {
    socket.to(roomId).emit('broadcast-action', actionPayload);
  });

  // Robust Disconnection Handling
  const cleanup = () => {
    for (const [roomId, users] of roomRegistry.entries()) {
      const userArray = Array.from(users);
      const userToRemove = userArray.find(u => u.socketId === socket.id);
      
      if (userToRemove) {
        users.delete(userToRemove);
        console.log(`[CLEANUP] User ${userToRemove.userName} left room ${roomId}. Mesh size: ${users.size}`);
        
        // Notify others to tear down peer connections
        socket.to(roomId).emit('user-left-mesh', {
          socketId: socket.id,
          userId: userToRemove.userId
        });

        // Delete empty rooms
        if (users.size === 0) {
          roomRegistry.delete(roomId);
          console.log(`[ROUTING] Room ${roomId} decommissioned.`);
        }
        break;
      }
    }
  };

  socket.on('disconnecting', cleanup);
  socket.on('error', (err) => console.error(`[SOCKET_ERR]: ${err.message}`));
});

// Health check endpoint for Vercel/Render deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', connections: io.engine.clientsCount, rooms: roomRegistry.size });
});

server.listen(PORT, () => {
    console.log(`
    ========================================
    SYNC-MEET CORE SIGNALING SERVER ACTIVE
    ========================================
    Port: ${PORT}
    Protocol: Socket.io 4.x
    Mesh Engine: Multi-User Distributed
    ========================================
    `);
});
