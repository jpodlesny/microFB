/*jshint node: true */
var express = require('express');
var app = require('./config/app')(express());
var expressSession = require('express-session');
var mongoose = require('mongoose');

var server = require('http').createServer(app);

var MemoryStore = require('connect/lib/middleware/session/memory');
var session_store = new MemoryStore();
// parametry aplikacji
var port = process.env.PORT || 3000;
var secret = process.env.APP_SECRET || '$sekretny $sekret';
var configDB = require('./config/database');

// Model Mongoose reprezentujący uzytkownika
var User = require('./models/user');
var Post = require('./models/post');
var Chat = require('./models/chat');

var connect = require("connect");

// polaczenie z baza
mongoose.connect(configDB.url);
var db = mongoose.connection;
db.on('open', function () {
    console.log('Nawiązano połączenie z bazą');
});
db.on('error', console.error.bind(console, 'MongoDb Error: '));

// inicjowanie sesji
app.use(expressSession({
    secret: secret,
    resave: true,
    saveUninitialized: false,
    store: session_store
}));



var passport = require('./config/passport');
// Używamy Passport.js
app.use(passport.initialize());
app.use(passport.session());

// routy
var routes = require('./routes/routes');
app.use('/', routes);

// export sesji i app
exports.session_store = session_store;
exports.app = app;

// sockety
var socketio = require("socket.io");
io = socketio.listen(server);
wall = require("./routes/socketWall")(io);
searchFriends = require("./routes/socketSearchBar")(io);
friendRequest = require("./routes/socketFriendRequest")(io);
chats = require("./routes/socketChat")(io);
chatList = require("./routes/socketChatList")(io);


// Uruchamiamy serwer HTTPS
server.listen(port, function () {
    console.log('http://localhost:' + port);
});
