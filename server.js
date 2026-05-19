const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const rooms = new Map(); // roomId -> { players: [{id, faction}] }

  io.on('connection', (socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);

    socket.on('create_room', (roomId) => {
      console.log(`[Socket] Room created: ${roomId} by ${socket.id}`);
      socket.join(roomId);
      rooms.set(roomId, {
        players: [{ id: socket.id, faction: 'blue', isHost: true }]
      });
      socket.emit('room_created', { roomId, faction: 'blue', isHost: true });
    });

    socket.on('join_room', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length < 2) {
        socket.join(roomId);
        room.players.push({ id: socket.id, faction: 'red', isHost: false });
        socket.emit('room_joined', { roomId, faction: 'red', isHost: false });
        
        // Notify both players that the room is ready to start
        io.to(roomId).emit('room_ready', { roomId, players: room.players });
        console.log(`[Socket] Player ${socket.id} joined room ${roomId}. Room is ready.`);
      } else {
        socket.emit('room_error', { message: 'Room not found or full' });
      }
    });

    socket.on('client_unit_move', (data) => {
      console.log(`[Server Relay] Moving entity ${data.entityId} in room ${data.roomId} to Col:${data.targetCol}, Row:${data.targetRow}`);
      socket.to(data.roomId).emit('server_unit_move', data);
    });

    socket.on('client_build_structure', ({ roomId, type, col, row, entityId, faction }) => {
      console.log(`[Server Build Relay] Room ${roomId}: ${faction} is building ${type} at [Col:${col}, Row:${row}]`);
      socket.to(roomId).emit('server_build_structure', { type, col, row, entityId, faction });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Player disconnected: ${socket.id}`);
      // Basic cleanup: find which room they were in and notify the other player
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomId).emit('player_disconnected', { id: socket.id });
          if (room.players.length === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
