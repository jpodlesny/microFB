
var connect = require("connect");
var session_store = require("./../app").session_store;
var app = require("./../app").app;
var User = require('./../models/user');
var Post = require('./../models/post');
var mongoose = require('mongoose');

var showResult = function(socket, data) {
  User.find({
        username: new RegExp(data, "i")
        }).limit(5).exec(function(err, user) {
    app.render('main/searchResult', {'users':user}, function(err, view){
       socket.emit('returnSearch',{'view': view});
    });
  });
 };


module.exports = function (io) {
    io.of('/searchBar').on('connection',function(socket){

        var cookie_string = socket.request.headers.cookie;
        var parsed_cookies = connect.utils.parseCookie(cookie_string);
        var connect_sid = parsed_cookies['connect.sid'].split(".")[0].split(":")[1];
        var session;
        if (connect_sid) {
            if(session_store.sessions[connect_sid] !== undefined){
                session = JSON.parse(session_store.sessions[connect_sid]);

                socket.on('disconnect', function() {
                });

                socket.on('sendSearch',function(data){

                    showResult(socket,data.content);

                });

            }
        }

    });
};
