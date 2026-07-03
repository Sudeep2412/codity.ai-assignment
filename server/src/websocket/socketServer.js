const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    }
  });

  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    logger.debug(`Client connected to WebSocket: ${socket.id} (User: ${socket.user.id})`);
    
    socket.on('subscribe:queue', (queueId) => {
      socket.join(`queue:${queueId}`);
      logger.debug(`Socket ${socket.id} joined queue:${queueId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });

  // Listen to Redis Pub/Sub for job events to broadcast
  const eventSub = new Redis(env.REDIS_URL);
  eventSub.subscribe('jobs:events');
  eventSub.on('message', (channel, message) => {
    if (channel === 'jobs:events') {
      try {
        const event = JSON.parse(message);
        // Broadcast to specific queue room using the event type (e.g. job:completed)
        io.to(`queue:${event.queueId}`).emit(event.type, event);
        // Also broadcast a general dashboard update
        io.emit('dashboard:update', event);
      } catch (err) {
        logger.error('Error parsing redis message', err);
      }
    }
  });

  return io;
}

module.exports = {
  initSocketServer,
  getIO: () => io
};
