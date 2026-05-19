import { io, Socket } from 'socket.io-client';

// Single shared socket instance
export const socket: Socket = io({
    autoConnect: false, // We'll connect it when App mounts
});
