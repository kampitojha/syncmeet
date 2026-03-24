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

  socket.on('join-room', (rawRoomId, userId, userName) => {
    if (!rawRoomId || !userId) return;
    
    // Normalize room ID for casing consistency
    const roomId = rawRoomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    socket.join(roomId);
    
    if (!roomRegistry.has(roomId)) {
      roomRegistry.set(roomId, new Map());
    }

    const roomMap = roomRegistry.get(roomId);
    
    // Clean up any old socket for this userId in this room (ghosting prevention)
    if (roomMap.has(userId)) {
        const oldSid = roomMap.get(userId).socketId;
        socket.to(roomId).emit('user-left-mesh', { socketId: oldSid, userId });
    }

    const userData = { socketId: socket.id, userId, userName };
    roomMap.set(userId, userData);

    const existingUsers = Array.from(roomMap.values()).filter(u => u.socketId !== socket.id);
    socket.emit('mesh-manifest', existingUsers);
    socket.to(roomId).emit('user-entered-mesh', userData);

    console.log(`[ROUTING] User ${userName} joined room ${roomId}. Mesh size: ${roomMap.size}`);
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
    for (const [roomId, roomMap] of roomRegistry.entries()) {
      const userToRemove = Array.from(roomMap.values()).find(u => u.socketId === socket.id);
      
      if (userToRemove) {
        roomMap.delete(userToRemove.userId);
        console.log(`[CLEANUP] User ${userToRemove.userName} left room ${roomId}. Mesh size: ${roomMap.size}`);
        
        socket.to(roomId).emit('user-left-mesh', {
          socketId: socket.id,
          userId: userToRemove.userId
        });

        if (roomMap.size === 0) {
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
