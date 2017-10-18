
var connect = require("connect");
var session_store = require("./../app").session_store;
var app = require("./../app").app;
var User = require('./../models/user');
var Post = require('./../models/post');
var FriendRequest = require('./../models/friendRequest');
var Chat = require('./../models/chat');
var Message = require('./../models/message');

var mongoose = require('mongoose');
var session;

var connectedUsers = [];


var friendRequestResult = function(socket, data) {

    FriendRequest.findOne({'userSend':session.user._id,'userReceive':data}).exec(function(err, friendrequest) {
        if (friendrequest !== null){
            friendrequest.remove(function () {});
            app.render('main/friendrequest', {'text':'Dodaj do znajomych'}, function(err, view){
                socket.emit('returnFriendRequestResult',{'response': view});
            });
        } else {

            var tmp = new FriendRequest({'userSend':session.user._id,'userReceive':data});
            tmp.save(function () {});
            app.render('main/friendrequest', {'text':'','text2':'Zaproszenie zostało wysłane. Aby anulować, wejdź w Znajomi.'}, function(err, view){
                socket.emit('returnFriendRequestResult',{'response': view});
                if (typeof connectedUsers[data] !== 'undefined') {
                  connectedUsers[data].emit('returnNotificationResult');
                }
            });
        }

    });
 };

 var friendRequestRender = function(socket, data) {
        FriendRequest.findOne({$or:[{'userSend':session.user._id,'userReceive':data},{'userReceive':session.user._id,'userSend':data}]}).exec(function(err, friendrequest) {
            if (session.user._id != data) {
                if (friendrequest !== null){
                    if (friendrequest.status === 0) {
                      FriendRequest.find({'userReceive':session.user._id,'status':0}).populate("userSend").exec(function(err, friendrequest) {
                          app.render('main/receivedInv', {'toMe': friendrequest }, function(err, view){
                              socket.emit('acceptInvitationResult',{'response': view});
                          });
                      });
                        if (friendrequest.userReceive == session.user._id) {
                          User.findOne({'_id':data}).exec(function (err, user) {
                            app.render('main/friendrequest', {'text':'','text2':'Użytkownik '+user.username+' wysłał już Tobie zaproszenie. Wejdź w Znajomi i zaakceptuj!'}, function(err, view){
                                socket.emit('returnFriendRequestResult',{'response': view});
                            });
                          });
                        } else {
                          User.findOne({'_id':data}).exec(function (err, user) {
                            app.render('main/friendrequest', {'text':'','text2':user.username+' otrzymał już zaproszenie! Aby anulować, wejdź w Znajomi.'}, function(err, view){
                                socket.emit('returnFriendRequestResult',{'response': view});
                              });
                            });
                        }
                    }
                }else{
                  User.findOne({'_id':data}).exec(function (err, user) {
                    app.render('main/friendrequest', {'text':user.username+' - dodaj do znajomych'}, function(err, view){
                        socket.emit('returnFriendRequestResult',{'response': view});
                    });

                  });

                }
            }

        });
 };


var getAllFriends = function (socket) {
    FriendRequest.find(
        {$and: [
            {$or:[{'userReceive':session.user._id},{'userSend':session.user._id}]},
            {$or:[{'status':1},{'status':2}]}
        ]}).populate("userSend userReceive").exec(function(err, friendrequest) {
        app.render('main/friends', {'friends': friendrequest, 'userId': session.user._id }, function(err, view){
            socket.emit('friendsResult',{'response': view});
        });
    });
};

var receivedRender = function (socket) {
    FriendRequest.find({'userReceive':session.user._id,'status':0}).populate("userSend").exec(function(err, friendrequest) {
        app.render('main/receivedInv', {'toMe': friendrequest }, function(err, view){
            socket.emit('acceptInvitationResult',{'response': view});
        });
    });
};

var sentRender = function (socket) {
    FriendRequest.find({'userSend':session.user._id,'status':0}).populate("userReceive").exec(function(err, friendrequest) {
        app.render('main/sentInv', {'sentTo': friendrequest }, function(err, view){
            socket.emit('removeInvitationResult',{'response': view});
        });
    });
};

var newAcceptInvitation = function (socket) {
  FriendRequest.find({'userReceive':session.user._id,'status':0}).exec(function(err, friendrequest) {
    if (friendrequest != '') {
      connectedUsers[session.user._id].emit('returnNotificationResult',{});
    }
  });
};



module.exports = function (io) {
    io.of('/friendRequest').on('connection',function(socket){

        var cookie_string = socket.request.headers.cookie;
        var parsed_cookies = connect.utils.parseCookie(cookie_string);
        var connect_sid = parsed_cookies['connect.sid'].split(".")[0].split(":")[1];

        if (connect_sid) {
            if(session_store.sessions[connect_sid] !== undefined){
                session = JSON.parse(session_store.sessions[connect_sid]);

                connectedUsers[session.user._id] = socket;

                newAcceptInvitation(socket);

                socket.on('disconnect', function() {
                });

                socket.on('sendFriendRequest',function(data){
                    friendRequestResult(socket,data.id);
                });

                socket.on('friendRequestRender',function(data){
                    friendRequestRender(socket,data.id);
                });


                socket.on('toMeRequestsRender',function(data){
                    receivedRender(socket);
                });

                socket.on('sentToRequestsRender',function(data){
                    sentRender(socket);
                });

                socket.on('friendsRequestsRender',function(data){
                    getAllFriends(socket);

                });

                socket.on('acceptInvitation',function(data){
                    FriendRequest.findOne({'userReceive':session.user._id,'userSend':data.id}).exec(function(err, friendrequest) {
                        if (friendrequest !== null) {
                          friendrequest.status = 1;
                          friendrequest.userSendFollow = 1;
                          friendrequest.userReceiveFollow = 1;
                          friendrequest.save(function () {
                            receivedRender(socket);
                            getAllFriends(socket);
                            if (typeof connectedUsers[data.id] !== 'undefined') {
                              connectedUsers[data.id].emit('removeRemoveInvitation', {'id':session.user._id});
                            }
                        });}
                    });
                });

                socket.on('removeInvitation',function(data){
                    FriendRequest.findOne({'userSend':mongoose.Types.ObjectId(session.user._id),'userReceive':data.id}).exec(function(err, friendrequest) {
                        if (friendrequest !== null) {
                          friendrequest.remove(function () {

                            if (typeof connectedUsers[data.id] !== 'undefined') {
                              sentRender(socket);
                              connectedUsers[data.id].emit('removeAcceptInvitation', {'id':session.user._id});
                            }
                          });
                        }
                    });
                });

                socket.on('removeFriend',function(data){
                    FriendRequest.findOne(
                        {$or:[
                            {'userSend':mongoose.Types.ObjectId(session.user._id),'userReceive':data.id},
                            {'userReceive':mongoose.Types.ObjectId(session.user._id),'userSend':data.id}
                            ]}
                        ).exec(function(err, friendrequest) {
                        if (friendrequest !== null) {
                          Chat.findOne({$and:[{users: {$size: 2}},{'users':data.id},{'users':session.user._id}]}).exec(function (err, chat) {
                            if (chat !== null) {
                              Message.remove({'_id':{$in:chat.content}}, function (err, message){
                                if (err) throw err;
                                chat.remove(function (){
                                  friendrequest.remove(function () {

                                    if (typeof connectedUsers[data.id] !== 'undefined') {
                                      getAllFriends(socket);
                                      connectedUsers[data.id].emit('removeFriendPosition', {'id':session.user._id});
                                    }
                                  });
                                });
                              });
                            } else {
                              friendrequest.remove(function () {
                                getAllFriends(socket);
                                if (typeof connectedUsers[data.id] !== 'undefined') {
                                  connectedUsers[data.id].emit('removeFriendPosition', {'id':session.user._id});
                                }
                              });
                            }
                          });
                        }
                    });
                });

                socket.on('stopFollow',function(data){
                    FriendRequest.findOne(
                        {$or:[
                            {'userSend':mongoose.Types.ObjectId(session.user._id),'userReceive':data.id},
                            {'userReceive':mongoose.Types.ObjectId(session.user._id),'userSend':data.id}
                            ]}
                        ).exec(function(err, friendrequest) {
                        if (friendrequest !== null){
                            var text="";
                            if (String(friendrequest.userSend) === String(session.user._id)) {
                                if (friendrequest.userSendFollow === 1) {
                                  friendrequest.userSendFollow = 0;
                                  text="Obserwuj";
                                } else {
                                  friendrequest.userSendFollow = 1;
                                  text="Przestań obserwować";
                                }
                            }else{
                                if (friendrequest.userReceiveFollow === 1) {
                                  friendrequest.userReceiveFollow = 0;
                                  text="Obserwuj";
                                }else{
                                  friendrequest.userReceiveFollow = 1;
                                  text="Przestań obserwować";
                                }
                            }
                            friendrequest.save(function (err) {
                                socket.emit('changeObservFriendResult',{'id':data.id,'response': text});
                            });
                        }
                    });
                });

                socket.on('areSelectedUsersFriends', function(data) {

                  var arr = [];
                  var arrError = [];
                  var tmp = 0;

                  User.find({'_id':{$in:data.id}}).populate('friendsSend friendsReceive').exec(function (err, user) {

                    for (var j=0; j<user.length; j++) {

                      for (var k=0; k<user[j].friendsSend.length; k++) {
                        if (user[j].friendsSend[k].userReceive != session.user._id) {
                          if (user[j].friendsSend[k].status == 1) {
                            arr.push(String(user[j].friendsSend[k].userReceive));
                          }
                        }
                      }

                      for (var m=0; m<user[j].friendsReceive.length; m++) {
                        if (user[j].friendsReceive[m].userSend != session.user._id) {
                          if (user[j].friendsReceive[m].status == 1) {
                            arr.push(String(user[j].friendsReceive[m].userSend));
                          }
                        }
                      }

                      for (var n=0; n<arr.length; n++) {
                        for (var i=0; i<data.id.length; i++) {
                          if (String(data.id[i]) != String(user[j]._id)) {
                            if (arr[n] == data.id[i]) {
                              tmp += 1;
                            }
                          }
                        }
                      }

                      if (data.id.length-1 != tmp) {
                        arrError.push(user[j].username);
                      }

                      tmp = 0;
                      arr = [];
                    }
                    if (arrError != '') {
                      socket.emit('areSelectedUsersFriendsResult2',{'text':arrError});
                    } else {
                      socket.emit('areSelectedUsersFriendsResult',{'id':data.id});
                    }
                  });
                });

            }
        }

    });
};
