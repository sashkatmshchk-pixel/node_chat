'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

const rooms = {
  general: [],
};

const users = {};

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  let currentRoom = 'general';

  socket.join(currentRoom);
  users[socket.id] = { room: currentRoom };

  socket.emit('history', rooms[currentRoom]);
  sendUsers(currentRoom);

  socket.on('setUsername', (username) => {
    users[socket.id].name = username;
    sendUsers(currentRoom);
  });

  socket.on('createRoom', (room) => {
    if (!rooms[room]) {
      rooms[room] = [];
      io.emit('roomCreated', room);
    }
  });

  socket.on('joinRoom', (room) => {
    socket.leave(currentRoom);

    currentRoom = room;

    if (!rooms[currentRoom]) {
      rooms[currentRoom] = [];
    }

    users[socket.id].room = currentRoom;

    socket.join(currentRoom);

    socket.emit('history', rooms[currentRoom]);

    sendUsers(currentRoom);
  });

  socket.on('message', (data) => {
    const message = {
      author: data.author,
      text: data.text,
      time: new Date().toLocaleTimeString(),
    };

    rooms[currentRoom].push(message);

    io.to(currentRoom).emit('message', message);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    sendUsers(currentRoom);
  });

  function sendUsers(room) {
    const roomUsers = Object.values(users)
      .filter((u) => u.room === room && u.name)
      .map((u) => u.name);

    io.to(room).emit('users', roomUsers);
  }
});

server.listen(PORT);
