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

    socket.on('client_spawn_unit', ({ roomId, type, col, row, entityId, faction }) => {
      console.log(`[Server Spawn Relay] Room ${roomId}: spawning ${type} for ${faction} at [Col:${col}, Row:${row}] with ID ${entityId}`);
      socket.to(roomId).emit('server_spawn_unit', { type, col, row, entityId, faction });
    });

    socket.on('client_unit_transformed', (data) => {
      console.log(`[Server Transform Relay] Room ${data.roomId}: transforming ${data.oldEntityId} -> ${data.newEntityId}`);
      socket.to(data.roomId).emit('server_unit_transformed', data);
    });

    socket.on('client_start_gathering', ({ roomId, entityId, resourceX, resourceY, resourceType }) => {
      console.log(`[Server Gathering Relay] Room ${roomId}: entity ${entityId} start gathering at [${resourceX}, ${resourceY}]`);
      socket.to(roomId).emit('server_start_gathering', { entityId, resourceX, resourceY, resourceType });
    });

    socket.on('client_resource_depleted', ({ roomId, resourceX, resourceY, amount }) => {
      console.log(`[Server Depletion Relay] Room ${roomId}: resource depletion at [${resourceX}, ${resourceY}] by amount ${amount}`);
      socket.to(roomId).emit('server_resource_depleted', { resourceX, resourceY, amount });
    });

    socket.on('client_resource_harvested', ({ roomId, resourceId, amountHarvested }) => {
      console.log(`[Server Harvest Relay] Room ${roomId}: resource ${resourceId} harvested by amount ${amountHarvested}`);
      socket.to(roomId).emit('server_resource_harvested', { resourceId, amountHarvested });
    });

    socket.on('client_start_training', ({ roomId, barracksId, unitType }) => {
      console.log(`[Server Train Relay] Room ${roomId}: barracks ${barracksId} training ${unitType}`);
      socket.to(roomId).emit('server_start_training', { barracksId, unitType });
    });

    socket.on('client_construction_progress', ({ roomId, buildingId, progress }) => {
      console.log(`[Server Progress Relay] Room ${roomId}: building ${buildingId} progress is ${progress}%`);
      socket.to(roomId).emit('server_construction_progress', { buildingId, progress });
    });

    socket.on('client_start_constructing', ({ roomId, entityId, buildingId }) => {
      console.log(`[Server Build Start Relay] Room ${roomId}: entity ${entityId} start constructing building ${buildingId}`);
      socket.to(roomId).emit('server_start_constructing', { entityId, buildingId });
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
