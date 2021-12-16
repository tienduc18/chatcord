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
//var pg = require('pg');
//const client = new Client({
//  connectionString: process.env.DATABASE_URL,
//  ssl: true,
//});
const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5555,
  password: "huy04022000",
  database: "postgres"
})
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
  // Send photo
  socket.on("sendPhoto", function(data){
    var guess = data.base64.match(/^data:image\/(png|jpeg);base64,/)[1];
    var ext = "";
    switch(guess) {
      case "png"  : ext = ".png"; break;
      case "jpeg" : ext = ".jpg"; break;
      default     : ext = ".bin"; break;
    }
    var savedFilename = "/upload"+randomString(10)+ext;
    fs.writeFile(__dirname+"/public"+savedFilename, getBase64Image(data.base64), 'base64', function(err) {
      if (err !== null)
        console.log(err);
      else 
        io.to(roles.receiver).emit("receivePhoto", {
          path: savedFilename,
        });
        console.log("Send photo success!");
    });
  });

  function randomString(length)
  {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  } 
  function getBase64Image(imgData) {
    return imgData.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  }
  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));

    // Print to console the message, room and username
    var tablename = `${user.room}_room`.toLowerCase();
    var text = `CREATE TABLE IF NOT EXISTS ${tablename}\
              ("msg_id" SERIAL,\
              "sender" VARCHAR(50) NOT NULL,\
              "msg" VARCHAR(100) NOT NULL,\
              PRIMARY KEY ("msg_id"));`;
    client.query(text, (err, res) => {    
      if (err) {
        console.error(err);
        return;
      }
    console.log('Data create successful');
    })
    var username = `${user.username}`;
    client.query(`INSERT INTO "${tablename}" ("sender","msg") VALUES ($1, $2);`,[username, msg]);    

    // Save to the database
  });


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
