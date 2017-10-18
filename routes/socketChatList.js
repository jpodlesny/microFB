var connect = require("connect");
var session_store = require("./../app").session_store;
var app = require("./../app").app;
var User = require('./../models/user');
var Chat = require('./../models/chat');
var Message = require('./../models/message');
var FriendRequest = require('./../models/friendRequest');
var mongoose = require('mongoose');
var session;
var moment = require('moment');

var connectedUsers = [];


var getAllSingleChat = function (socket) {

    Chat.find({$and:[{users: {$size: 2}},{'users':session.user._id}]}).populate('users').exec(function (err, chat) {

      var arr2 = [];
      for (var j=0; j<chat.length; j++) {
        for (var k=0; k<chat[j].users.length; k++) {
          if (String(chat[j].users[k]._id) !== String(session.user._id)) {
            arr2.push(chat[j].users[k]._id);
            arr2.push(chat[j].users[k].username);
          }
        }
        arr2.push(chat[j]._id);
      }

      app.render('main/singleChat', {'chatTo':arr2, 'userId': session.user._id }, function(err, view){
          socket.emit('singleChatListResult',{'response': view});
      });
    });
};


var getAllGroupChat = function (socket) {

    Chat.find({$and:[{$where: "this.users.length > 2" },{'users':session.user._id}]}).populate('users').exec(function (err, chat) {

      var arr = new Array(chat.length);

      for(var i=0; i<chat.length; i++) {
        arr[i] = new Array((chat[i].users.length-1)*2);
        var count = 0;
          for( var t=0; t<chat[i].users.length; t++) {
              if(chat[i].users[t]._id != session.user._id) {
                arr[i][count] = chat[i].users[t]._id;
                arr[i][count+1] = chat[i].users[t].username;
                count += 2;
              }
          }
      }
    app.render('main/groupChat', {'chatTo':arr, 'chatId':chat, 'userId': session.user._id }, function(err, view){
        socket.emit('groupChatListResult',{'response': view});
    });
    });
};


var isSingleChatRead = function (socket) {
  var arr = [];
  Chat.find({$and:[{users: {$size: 2}},{'users':session.user._id}]}).exec(function (err, chat) {
    for (var i=0; i<chat.length; i++) {
      var index = chat[i].read.indexOf(session.user._id);
      if (index > -1) {
      } else {
        arr.push(chat[i].read);

      }
    }
    if (arr != '') {
      socket.emit('showUnreadSingleChat',{'id':arr});
      socket.emit('returnNotificationResult');
    }

  });
};


var isGroupChatRead = function (socket) {
  var arr = [];
  Chat.find({$and:[{$where: "this.users.length > 2" },{'users':session.user._id}]}).exec(function (err, chat) {
    for (var i=0; i<chat.length; i++) {
      var index = chat[i].read.indexOf(session.user._id);
      if (index == -1) {
        arr.push(chat[i]._id);
      }
    }
    if (arr != '') {
      socket.emit('showUnreadGroupChat',{'id':arr});
      socket.emit('returnNotificationResult');
    }

  });
};


function diff(A, B) {
    return A.filter(function (a) {
        return B.indexOf(a) == -1;
    });
}



module.exports = function (io) {
    io.of('/chats').on('connection',function(socket){

        var cookie_string = socket.request.headers.cookie;
        var parsed_cookies = connect.utils.parseCookie(cookie_string);
        var connect_sid = parsed_cookies['connect.sid'].split(".")[0].split(":")[1];

        if (connect_sid) {
            if(session_store.sessions[connect_sid] !== undefined){
                session = JSON.parse(session_store.sessions[connect_sid]);

                connectedUsers[session.user._id] = socket;

                socket.on('disconnect', function() {
                });

                socket.on('singleChatListRender',function(data){
                    getAllSingleChat(socket);
                });

                socket.on('isSingleChatRead', function(data) {
                    isSingleChatRead(socket);
                });

                socket.on('groupChatListRender',function(data){
                    getAllGroupChat(socket);
                });

                socket.on('isGroupChatRead', function(data) {
                  isGroupChatRead(socket);
                });

                socket.on('sendEveryoneMsg', function(data){

                  var tmpMsg = new Message({});
                  tmpMsg.content = data.msg;
                  tmpMsg.author = mongoose.Types.ObjectId(session.user._id);

                  if (data.single == true) {
                    Chat.find({$and:[{users: {$size: 2}},{'users':session.user._id}]}).exec(function (err, chat) {
                      tmpMsg.save(function (err) {
                        for (var i=0; i<chat.length; i++) {
                          chat[i].content.push(mongoose.Types.ObjectId(tmpMsg._id));
                          chat[i].update({'content':chat[i].content},{'content':chat[i].content}).exec(function (err, updated) {
                          });

                          for (var j=0; j<chat[i].users.length; j++) {
                            if (String(chat[i].users[j]) !== String(session.user._id)) {
                              var index = chat[i].read.indexOf(chat[i].users[j]);
                              if (index > -1) {
                                chat[i].read.splice(index, 1);
                              }
                            }
                          }
                          chat[i].update({'read':chat[i].read},{'read':chat[i].read}).exec(function afterwards(err, updated) {
                          });
                          var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                          socket.to(String(chat[i].users)).emit('returnSendMsgResult',{'msg':data.msg, 'user':session.user.username, 'created':date});
                        }
                      });
                      socket.emit('returnSendEveryoneMsgResult',{'info':'WYSŁANO '});
                    });
                  }
                  if (data.group == true) {
                    Chat.find({$and:[{$where: "this.users.length > 2" },{'users':session.user._id}]}).exec(function (err, chat) {
                      tmpMsg.save(function (err) {
                        for (var j=0; j<chat.length; j++) {
                          chat[j].content.push(mongoose.Types.ObjectId(tmpMsg._id));
                          chat[j].update({'content':chat[j].content},{'content':chat[j].content}).exec(function (err, updated) {
                          });

                          for (var k=0; k<chat[j].users.length; k++) {
                            if (String(chat[j].users[k]) !== String(session.user._id)) {

                              var index = chat[j].read.indexOf(chat[j].users[k]);
                              if (index > -1) {
                                chat[j].read.splice(index, 1);
                              }
                            }
                          }
                          chat[j].update({'read':chat[j].read},{'read':chat[j].read}).exec(function afterwards(err, updated) {
                          });
                          var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                          socket.broadcast.to(String(chat[j].users)).emit('returnSendMsgResult',{'msg':data.msg, 'user':session.user.username, 'created':date});
                        }
                      });
                      socket.emit('returnSendEveryoneMsgResult',{'info':'WYSŁANO '});
                    });
                  }
                  if (data.single == false && data.group == false) {
                    tmpMsg.save(function (err) {
                      FriendRequest.find(
                          {$and: [
                              {$or:[{'userReceive':session.user._id},{'userSend':session.user._id}]},
                              {$or:[{'status':1},{'status':2}]}
                          ]}).exec(function(err, friends) {
                            var arrFriends = [];
                          for (var i=0; i<friends.length; i++){
                            if (friends[i].userSend == session.user._id) {
                              arrFriends.push(mongoose.Types.ObjectId(friends[i].userReceive));
                            } else {
                              arrFriends.push(mongoose.Types.ObjectId(friends[i].userSend));
                            }
                          }


                          User.findOne({'_id':session.user._id}).exec(function (err, user) {

                            Chat.find({$and:[{users: {$size: 2}},{'users':session.user._id}]}).exec(function (err, chat) {

                              var arrChat = [];
                              for(var i=0; i<chat.length; i++) {
                                arrChat.push(diff(chat[i].users.map(String),String(session.user._id)));
                              }

                              var arrDiff = diff(arrFriends.map(String),arrChat.map(String));

                              if (arrDiff != '') {
                                User.find({'_id':arrDiff}).exec(function (err, usersEmpty) {
                                    for (var j=0; j<usersEmpty.length; j++) {
                                      var tmp = new Chat({});
                                      tmp.users.push(mongoose.Types.ObjectId(session.user._id));
                                      tmp.users.push(mongoose.Types.ObjectId(usersEmpty[j]._id));
                                      tmp.content = tmpMsg._id;
                                      tmp.read.push(mongoose.Types.ObjectId(session.user._id));
                                      tmp.save(function () {
                                        getAllSingleChat(socket);
                                      });
                                    }
                                });
                              }

                              Chat.find({$and:[{users: {$size: 2}},{'users':session.user._id}]}).exec(function (err, chat) {
                                for (var i=0; i<chat.length; i++) {
                                  chat[i].content.push(mongoose.Types.ObjectId(tmpMsg._id));
                                  chat[i].update({'content':chat[i].content},{'content':chat[i].content}).exec(function (err, updated) {
                                  });

                                  for (var j=0; j<chat[i].users.length; j++) {
                                    if (String(chat[i].users[j]) !== String(session.user._id)) {
                                      var index = chat[i].read.indexOf(chat[i].users[j]);
                                      if (index > -1) {
                                        chat[i].read.splice(index, 1);
                                      }
                                    }
                                  }
                                  chat[i].update({'read':chat[i].read},{'read':chat[i].read}).exec(function afterwards(err, updated) {
                                  });
                                  var date = moment(tmpMsg.created).format('YYYY-MM-DD HH:mm');
                                  socket.to(String(chat[i].users)).emit('returnSendMsgResult',{'msg':data.msg, 'user':session.user.username, 'created':date});
                                }
                                socket.emit('returnSendEveryoneMsgResult',{'info':'WYSŁANO '});
                              });
                            });
                          });
                      });
                    });
                  }

                });

                socket.on('deleteSingleChat', function(data) {
                  Chat.findOne({'_id':data.id}).exec(function (err, chat) {
                    if (chat !== null) {
                      socket.emit('hideDeletedSingleChat',{'_id': data.id});
                      Message.remove({'_id':{$in:chat.content}}, function (err, message){
                        if (err) throw err;
                          chat.remove(function (){});
                      });
                    }
                  });
                });

                socket.on('deleteGroupChat', function(data) {
                  Chat.findOne({'_id':data.id}).exec(function (err, chat) {
                    if (chat !== null) {
                      socket.emit('hideDeletedGroupChat',{'_id': data.id});
                      Message.remove({'_id':{$in:chat.content}}, function (err, message){
                        chat.remove(function (){});
                      });
                    }
                  });
                });

                socket.on('setChatRead', function (data) {
                  Chat.findOne({'_id':data.id}).exec(function (err, chat) {
                    var index = chat.read.indexOf(session.user._id);
                    if (index > -1) {
                    } else {
                      chat.read.push(session.user._id);
                      chat.update({'read':chat.read},{'read':chat.read}).exec(function afterwards(err, updated) {
                      });
                    }
                  });
                });

                socket.on('areYourFriends', function (data) {
                  var arrUsernames = data.usernames.split(',');
                  User.find({'username':{$in:arrUsernames}}).exec(function (err, user) {
                    var arr = [];
                    for (var i=0; i<user.length; i++) {
                      arr.push(user[i]._id);
                    }
                    FriendRequest.find(
                        {$or:[
                            {'userSend':mongoose.Types.ObjectId(session.user._id),'userReceive':{$in:arr}},
                            {'userReceive':mongoose.Types.ObjectId(session.user._id),'userSend':{$in:arr}}
                            ]}
                        ).exec(function(err, friendrequest) {
                          if (friendrequest.length !== arr.length) {
                            socket.emit('areYourFriendsResult', {});
                          }
                      });
                  });
                });

              }
          }
      });
  };
