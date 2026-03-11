'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));

const rooms = {
  general: {
    messages: [],
    users: [],
  },
};

io.on('connection', (socket) => {
  let username = 'Anonymous';
  let currentRoom = 'general';

  socket.join(currentRoom);

  socket.emit('rooms', Object.keys(rooms));
  socket.emit('history', rooms[currentRoom].messages);
  io.emit('users', rooms[currentRoom].users);

  socket.on('setUsername', (name) => {
    username = name;

    if (!rooms[currentRoom].users.includes(username)) {
      rooms[currentRoom].users.push(username);
    }

    io.emit('users', rooms[currentRoom].users);
  });

  socket.on('createRoom', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        messages: [],
        users: [],
      };

      io.emit('rooms', Object.keys(rooms));
    }
  });

  socket.on('renameRoom', ({ oldName, newName }) => {
    if (!rooms[oldName] || rooms[newName]) {
      return;
    }

    rooms[newName] = rooms[oldName];
    delete rooms[oldName];

    io.emit('rooms', Object.keys(rooms));
  });

  socket.on('deleteRoom', (roomName) => {
    if (roomName === 'general') {
      return;
    }

    if (rooms[roomName]) {
      delete rooms[roomName];
      io.emit('rooms', Object.keys(rooms));
    }
  });

  socket.on('joinRoom', (roomName) => {
    socket.leave(currentRoom);

    currentRoom = roomName;
    socket.join(currentRoom);

    socket.emit('history', rooms[currentRoom].messages);
    io.emit('users', rooms[currentRoom].users);
  });

  socket.on('message', (data) => {
    const message = {
      author: username,
      text: data.text,
      time: new Date().toLocaleTimeString(),
    };

    rooms[currentRoom].messages.push(message);

    io.to(currentRoom).emit('message', message);
  });

  socket.on('disconnect', () => {
    rooms[currentRoom].users = rooms[currentRoom].users.filter(
      (user) => user !== username,
    );

    io.emit('users', rooms[currentRoom].users);
  });
});

server.listen(PORT);