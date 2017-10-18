
var connect = require("connect");
var session_store = require("./../app").session_store;
var app = require("./../app").app;
var User = require('./../models/user');
var Chat = require('./../models/chat');
var Message = require('./../models/message');
var FriendRequest = require('./../models/friendRequest');
var mongoose = require('mongoose');
var moment = require('moment');
var session;

var connectedUsers = [];


var showChat = function(socket, id, myId) {
    User.findOne({'_id': id}).exec(function (err, user) {
      FriendRequest.find(
          {$and:[
              {'status':1},
              {$or:[
                  {$and:[{'userSend':user._id},{'userSendFollow':1}]},
                  {$and:[{'userReceive':user._id},{'userReceiveFollow':1}]}
              ]}
          ]}
      ).populate("userReceive userSend").exec(function (err,friendrequest) {

        if (friendrequest != '') {
          Chat.findOne({$and:[{'users':myId},{'users':id},{users: {$size: 2}}]}).exec(function (err, chat){
            if (chat != null) {
              Message.find({'_id':chat.content}).sort({created:1}).populate('author').exec(function (err, message) {
                  app.render('main/messagesChat', {'message':message, 'user':user, 'user2':session.user, 'isAllowed':true, 'moment':moment}, function(err, view){
                     socket.emit('returShowChat',{'view': view});
                  });
              });
            } else {
              app.render('main/messagesChat', {'message':'', 'user':user, 'user2':session.user, 'isAllowed':true, 'moment':moment}, function(err, view){
                 socket.emit('returShowChat',{'view': view});
              });
            }
          });
        }
      });
    });
};

var showGroupChat = function(socket, ids, myId) {
    var tmp = ids.split(",");
    User.find({'_id':tmp}).exec(function (err, user) {
      Chat.find({users: {$size: tmp.length + 1}}).exec(function (err, chat) {
        tmp.push(myId);
        var arr = [];
        for (var i=0; i<chat.length; i++) {
          if (String(chat[i].users) == String(tmp.sort())) {
            arr = chat[i]._id;
          }
        }
        if (arr != '') {
          Chat.findOne({'_id':arr}).exec(function (err, chat) {
            Message.find({'_id':chat.content}).sort({created:1}).populate('author').exec(function (err, message) {
              app.render('main/messagesChat', {'message':message, 'user':user, 'user2':session.user, 'isAllowed':true, 'moment':moment}, function(err, view){
                 socket.emit('returShowChat',{'view': view});
              });
            });
          });
        } else {
          app.render('main/messagesChat', {'message':'', 'user':user, 'user2':session.user, 'isAllowed':true, 'moment':moment}, function(err, view){
             socket.emit('returShowChat',{'view': view});
          });
        }
      });
    });
};


module.exports = function (io) {
  io.of('/chat').on('connection',function(socket){

      var cookie_string = socket.request.headers.cookie;
      var parsed_cookies = connect.utils.parseCookie(cookie_string);
      var connect_sid = parsed_cookies['connect.sid'].split(".")[0].split(":")[1];

      if (connect_sid) {
        if(session_store.sessions[connect_sid] !== undefined){
            session = JSON.parse(session_store.sessions[connect_sid]);

            connectedUsers[session.user._id] = socket;

            socket.on('disconnect', function() {
            });

            socket.on('showChat',function(data){
              if (data.id.length<=24) {
                showChat(socket,data.id,data.myId);
              } else {
                showGroupChat(socket,data.id,data.myId);
              }

            });

            socket.on('joinToRoom', function(data) {
              var arr = [];
              arr.push(data.others);
              arr.push(data.me);
              arr.sort();
              socket.join(String(arr));
            });

            socket.on('sendMsg', function(data){

              var ids = data.id.split(",");
              var room = data.id.split(",");
              room.push(session.user._id);
              room.sort();
//czat z jedna osoba
              if (ids.length == 1) {

                var arrIds = [];
                arrIds.push(data.myId);
                for (var n=0; n<ids.length; n++){
                  arrIds.push(ids[n]);
                }
                arrIds.sort();
                Chat.findOne({'users':arrIds}).exec(function (err, chat){

                  var tmpMsg = new Message({});
                  tmpMsg.content = data.msg;
                  tmpMsg.author = mongoose.Types.ObjectId(data.myId);

                  if (chat == null){
                    var tmp = new Chat({});
                    tmp.users.push(mongoose.Types.ObjectId(data.myId));
                    tmp.users.push(mongoose.Types.ObjectId(data.id));
                    tmp.users.sort();
                    tmp.content = tmpMsg._id;
                    tmp.read.push(mongoose.Types.ObjectId(data.myId));

                    tmpMsg.save(function (err) {
                      tmp.save(function (err) {
                        User.findOne({'_id':data.myId}).exec(function (err, user) {
                          var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                          socket.emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                        });
                      });
                    });
                  } else {
                      chat.content.push(mongoose.Types.ObjectId(tmpMsg._id));

                      var index = chat.read.indexOf(data.id);
                      if (index > -1) {
                        chat.read.splice(index, 1);
                      }
                      if (typeof connectedUsers[data.id] !== 'undefined') {
                        connectedUsers[data.id].emit('returnNotificationResult',{});
                      }
                      chat.read.sort();
                      tmpMsg.save(function (err) {
                        chat.update({'content':chat.content},{'content':chat.content}).exec(function afterwards(err, updated) {
                          chat.update({'read':chat.read},{'read':chat.read}).exec(function afterwards(err, updated) {
                            User.findOne({'_id':data.myId}).exec(function (err, user) {
                              var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                              socket.to(String(room)).emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                              socket.emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                            });
                          });
                        });
                      });
                  }
                });

              } else {
//czat grupowy
                Chat.find({users: {$size: ids.length + 1}}).exec(function (err, chat) {

                  var tmpMsg = new Message({});
                  tmpMsg.content = data.msg;
                  tmpMsg.author = mongoose.Types.ObjectId(data.myId);

                  if (chat == '') {

                    var tmp = new Chat({});
                    tmp.users.push(mongoose.Types.ObjectId(data.myId));
                    for (var i=0; i<ids.length; i++){
                      tmp.users.push(mongoose.Types.ObjectId(ids[i]));
                    }
                    tmp.users.sort();
                    tmp.read.push(mongoose.Types.ObjectId(data.myId));
                    tmp.content = tmpMsg._id;
                    tmpMsg.save(function (err) {
                      tmp.save(function (err) {
                        socket.join(String(room));
                        User.findOne({'_id':data.myId}).exec(function (err, user) {
                          var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                          socket.emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                        });
                      });
                    });

                  } else {

                    var arrIds = [];
                    arrIds.push(data.myId);
                    for (var n=0; n<ids.length; n++){
                      arrIds.push(ids[n]);
                    }

                    var arr = [];
                    for (var j=0; j<chat.length; j++) {
                      if (String(chat[j].users) == String(arrIds.sort())) {
                        arr = chat[j]._id;
                      }
                    }

                    if (arr != '') {
                      Chat.findOne({'_id':arr}).exec(function (err, chat) {
                        chat.content.push(mongoose.Types.ObjectId(tmpMsg._id));
                        for (var i=0; i<chat.users.length; i++) {
                          var index = chat.read.indexOf(chat.users[i]);
                          if (index > -1) {
                            chat.read.splice(index, 1);
                          }
                        }
                        chat.read.sort();
                        tmpMsg.save(function (err) {
                          chat.update({'content':chat.content},{'content':chat.content}).exec(function afterwards(err, updated) {
                            chat.update({'read':chat.read},{'read':chat.read}).exec(function afterwards(err, updated) {
                              User.findOne({'_id':data.myId}).exec(function (err, user) {
                                var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                                socket.broadcast.to(String(room)).emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                                socket.emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                              });
                            });
                          });
                        });
                      });

                    } else {

                      var tmp2 = new Chat({});
                      tmp2.users.push(data.myId);
                      for (var k=0; k<ids.length; k++){
                        tmp2.users.push(ids[k]);
                      }
                      tmp2.users.sort();
                      tmp2.read.push(data.myId);
                      tmp2.content = tmpMsg._id;

                      tmpMsg.save(function (err) {
                        tmp2.save(function (err) {
                          User.findOne({'_id':data.myId}).exec(function (err, user) {
                            var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                            socket.emit('returnSendMsgResult',{'msg':data.msg, 'user':user.username, 'created':date});
                          });
                        });
                      });
                    }
                  }
                });
              }
            });
          }
      }
    });
};
