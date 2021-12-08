const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
//
//Connection to postgres database
const { Client } = require('pg');

const client = new Client({
   host: "localhost",
   user: "postgres",
   port: 5555,
   password: "huy04022000",
   database: "postgres"
})

client.connect();
// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });
  const text = `
    CREATE TABLE IF NOT EXISTS "table" (
	    "id" SERIAL,
	    "value" VARCHAR(100) NOT NULL,
	    PRIMARY KEY ("id")
    );`;
  client.query(text, (err, res) => {    
    if (err) {
      console.error(err);
      return;
    }
    console.log('Data create successful');
  })
  msg = 'ư263572'
  // Save to database
  client.query('INSERT INTO "table" ("value") VALUES ($1);', [msg]);
  //Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 80;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
