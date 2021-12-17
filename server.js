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
//var conString = "postgres://postgres:huy04022000@localhost:5555/postgres";
//var conString = "postgres://YourUserName:YourPassword@localhost:5432/YourDatabase";
const { Client } = require('pg');
const { Console } = require('console');
//var pg = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
//const client = new Client({
//  host: "localhost",
//  user: "postgres",
//  port: 5555,
//  password: "huy04022000",
//  database: "postgres"
//})
//var client = new pg.Client(conString);
client.connect();
// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);
    //Lấy data để in ra màn hình
    var tablename = `${user.room}_room`.toLowerCase();
    let txt = "";
    client.query(`SELECT "msg","sender","timestamp" FROM "${tablename}" `, (err, res) => {
      if (err) {
          console.error(err);
          return;
      }
      for (let row of res.rows) {
        socket.emit('message', formatMessage.formatMessageTime(row["sender"], row["msg"], row["timestamp"])); 
      }
    });
    
    // Welcome current user
    socket.emit('message', formatMessage.formatMessage(botName, 'Chào mừng đến với ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage.formatMessage(botName, `${user.username} đã tham gia chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });
  // Send photo
  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage.formatMessage(user.username, msg));
    
    // Print to console the message, room and username
    var tablename = `${user.room}_room`.toLowerCase();
    const moment = require('moment');
    var time = moment().format('h:mm a')
    var text = `CREATE TABLE IF NOT EXISTS ${tablename}\
              ("msg_id" SERIAL,\
              "sender" VARCHAR(50) NOT NULL,\
              "msg" VARCHAR(100) NOT NULL,\
              "timestamp" VARCHAR(10) NOT NULL,\
              PRIMARY KEY ("msg_id"));`;
    client.query(text, (err, res) => {    
      if (err) {
        console.error(err);
        return;
      }
    console.log('Data create successful');
    })
    var username = `${user.username}`;
    client.query(`INSERT INTO "${tablename}" ("sender","msg","timestamp") VALUES ($1, $2, $3);`,[username, msg, time]);    

    // Save to the database
  });


  //Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage.formatMessage(botName, `${user.username} đã rời khỏi chat`)
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
