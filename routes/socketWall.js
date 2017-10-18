
var connect = require("connect");
var session_store = require("./../app").session_store;
var app = require("./../app").app;
var User = require('./../models/user');
var Post = require('./../models/post');
var FriendRequest = require('./../models/friendRequest');
var mongoose = require('mongoose');
var moment = require('moment');
var session;

var connectedUsers = [];

var showWall = function(socket, id) {
   Post.find({owner:id}).populate('owner author likes').sort({created : -1}).exec(function (err,post) {
     if (!err) {
        var iLiked = [];
        for (var i = post.length - 1; i >= 0; i--) {
            if (post[i].likes.length>0) {
                for (var j = post[i].likes.length - 1; j >= 0; j--) {
                    if (String(post[i].likes[j]._id) === String(session.user._id)) {
                        iLiked[i] = true;
                    }
                }
            }
        }
        var allowed = false;
        FriendRequest.find({$or:[{'userSend':session.user._id,'userReceive':id},{'userReceive':session.user._id,'userSend':id}]}).populate("userReceive userSend").exec(function (err,friendrequest) {

            if (id === session.user._id) {
                allowed = true;
            } else {
                for (var i = friendrequest.length - 1; i >= 0; i--) {
                    if (friendrequest[i].status >= 1 ) {
                        allowed = true;
                    }
                }
            }

            if (id === session.user._id) {
              showMyWall(socket,id);
            } else {
              User.findOne({'_id':id}).exec(function (err, user) {
                app.render('main/postList', {'title':'Tablica użytkownika '+user.username,'post':post,'user':session.user, 'myLiked':iLiked, 'isAllowed':allowed, 'moment':moment}, function(err, view){
                   socket.emit('returnWall',{'view': view});
                });
              });
            }
        });
      }
    });
 };


var showMyWall = function(socket, id) {
    FriendRequest.find(
        {$and:[
            {'status':1},
            {$or:[
                {$and:[{'userSend':id},{'userSendFollow':1}]},
                {$and:[{'userReceive':id},{'userReceiveFollow':1}]}
            ]}
        ]}
    ).populate("userSend userReceive").exec(function (err,friendrequest) {
        var friendList = [];
        for (var i = friendrequest.length - 1; i >= 0; i--) {
            if (String(friendrequest[i].userSend._id) === String(id)) {
               friendList.push(String(friendrequest[i].userReceive._id));
             }
            if (String(friendrequest[i].userReceive._id) === String(id)) {
               friendList.push(String(friendrequest[i].userSend._id));
             }
        }
        friendList.push(String(id));

        Post.find({
            $or:[
            {'owner':{$in:friendList}},
            {'author':{$in:friendList}}
            ]
        }).populate("owner author likes").sort({created : -1}).exec(function (err,post) {

            var postarr=[];

            for (var k=0; k<post.length; k++) {
              if ((friendList.indexOf(String(post[k].author._id)) > -1) && (friendList.indexOf(String(post[k].owner._id)) > -1)) {
                postarr.push(post[k]);
              }
            }


            var iLiked = [];
            for (var i = postarr.length - 1; i >= 0; i--) {
                if (postarr[i].likes.length>0) {
                    for (var j = postarr[i].likes.length - 1; j >= 0; j--) {
                        if (String(postarr[i].likes[j]._id) === String(id)) {
                            iLiked[i] = true;
                        }
                    }
                }
            }
            app.render('main/postList', {'title':'Twoja tablica','post':postarr,'user':session.user, 'myLiked':iLiked, 'isAllowed':true, 'moment':moment}, function(err, view){
               socket.emit('returnWall',{'view': view});
            });
        });
    });
 };


var showPost = function(socket, post_id, id) {
   Post.find({_id:post_id}).populate('owner author likes').exec(function (err,post) {
        if (!err) {
            app.render('main/postList', {'post':post, 'user':session.user, 'isAllowed':true, 'moment':moment, 'myLiked':[false]}, function(err, view){

               User.findOne({'_id':post[0].owner._id}).populate('friendsSend friendsReceive').exec(function (err, owner) {
                   User.findOne({'_id':post[0].author._id}).populate('friendsSend friendsReceive').exec(function (err, author) {
                     var ownerFriends = [];
                     var authorFriends = [];
                     var allFriends = [];
                     var tmpId;
                     // dla owner friends wobec author
                      for (var i=0; i<owner.friendsReceive.length; i++) {
                        if (owner.friendsReceive[i].userSendFollow == 1) {
                           tmpId = String(owner.friendsReceive[i].userSend);
                           if (ownerFriends.indexOf(tmpId)==-1) { ownerFriends.push(tmpId); }
                           tmpId = String(owner.friendsReceive[i].userReceive);
                           if (ownerFriends.indexOf(tmpId)==-1) { ownerFriends.push(tmpId); }
                        }
                      }
                      for (var i=0; i<owner.friendsSend.length; i++) {
                        if (owner.friendsSend[i].userSendFollow == 1) {
                           tmpId = String(owner.friendsSend[i].userSend);
                           if (ownerFriends.indexOf(tmpId)==-1) { ownerFriends.push(tmpId); }
                           tmpId = String(owner.friendsSend[i].userReceive);
                           if (ownerFriends.indexOf(tmpId)==-1) { ownerFriends.push(tmpId); }
                        }
                      }

                      // dla author friends wobec owner
                      for (var i=0; i<author.friendsReceive.length; i++) {
                        if (author.friendsReceive[i].userSendFollow == 1) {
                           tmpId = String(author.friendsReceive[i].userSend);
                           if (authorFriends.indexOf(tmpId)==-1) { authorFriends.push(tmpId); }
                           tmpId = String(author.friendsReceive[i].userReceive);
                           if (authorFriends.indexOf(tmpId)==-1) { authorFriends.push(tmpId); }
                        }
                      }
                      for (var i=0; i<author.friendsSend.length; i++) {
                        if (author.friendsSend[i].userSendFollow == 1) {
                           tmpId = String(author.friendsSend[i].userSend);
                           if (authorFriends.indexOf(tmpId)==-1) { authorFriends.push(tmpId); }
                           tmpId = String(author.friendsSend[i].userReceive);
                           if (authorFriends.indexOf(tmpId)==-1) { authorFriends.push(tmpId); }
                        }
                      }

                      // wspolni znajomi
                      for (var i=0; i<ownerFriends.length; i++) {
                        if (authorFriends.indexOf(ownerFriends[i])!= -1 && allFriends.indexOf(ownerFriends[i])==-1) {
                           allFriends.push(ownerFriends[i]);
                        }
                      }
                      for (var i=0; i<authorFriends.length; i++) {
                        if (ownerFriends.indexOf(authorFriends[i])!= -1 && allFriends.indexOf(authorFriends[i])==-1) {
                           allFriends.push(authorFriends[i]);
                        }
                      }

                      for (var i=0; i<allFriends.length; i++) {
                         if (typeof connectedUsers[allFriends[i]] !== 'undefined') {
                          connectedUsers[allFriends[i]].emit('returnNewPost',{'view': view});
                          connectedUsers[allFriends[i]].emit('hideDeletePostDiv',{'id':post[0]._id});
                         }
                      }
                  });
                });
             });
        }
    });
 };



module.exports = function (io) {
    io.of('/wall').on('connection',function(socket){

        var cookie_string = socket.request.headers.cookie;
        var parsed_cookies = connect.utils.parseCookie(cookie_string);
        var connect_sid = parsed_cookies['connect.sid'].split(".")[0].split(":")[1];

        if (connect_sid) {
            if(session_store.sessions[connect_sid] !== undefined){
                session = JSON.parse(session_store.sessions[connect_sid]);

                connectedUsers[session.user._id] = socket;

                socket.on('disconnect', function() {
                });

                socket.on('sendPostMsg',function(data){

                    var tmp = new Post({});
                    tmp.content = data.data;
                    tmp.share = data.share;

                    if(typeof data.username != 'undefined'){

                      User.findOne({'username':data.username}).exec(function(err,user){
                        if(!err){
                          tmp.author = mongoose.Types.ObjectId(user.id);

                          if(typeof data.id != 'undefined'){
                              tmp.owner = mongoose.Types.ObjectId(data.id);
                          }else{
                              tmp.owner = mongoose.Types.ObjectId(session.user._id);
                          }

                          tmp.save(function (err) {
                              User.findOne({'_id':tmp.owner},function (err,user) {
                                  showPost(socket, tmp._id);
                              });
                          });

                        }
                      });
                    } else {
                      tmp.author = mongoose.Types.ObjectId(session.user._id);

                      if(typeof data.id != 'undefined'){
                          tmp.owner = mongoose.Types.ObjectId(data.id);
                      }else{
                          tmp.owner = mongoose.Types.ObjectId(session.user._id);
                      }

                      tmp.save(function (err) {
                          User.findOne({'_id':tmp.owner},function (err,user) {
                              showPost(socket, tmp._id);
                          });
                      });
                    }
                });

                socket.on('getWall',function(data){
                    if (typeof data.myWall != 'undefined') {
                        if (data.myWall) {
                            showMyWall(socket,data.id);
                        } else {
                            showWall(socket,data.id);
                        }
                    }else{
                        showWall(socket,data.id);
                    }
                });

                socket.on('sendPostLike',function(data){
                    Post.findOne({'_id':data.id}).populate("likes").exec(function (err,post) {
                        var state = 1, pos;

                        for (var j=0; j<post.likes.length; j++) {
                            if (post.likes[j]._id == session.user._id) {
                              state = 0;
                              pos = j;
                            }
                        }

                        if (state === 1) {
                          post.likes.push(session.user._id);
                        } else {
                          post.likes.splice(pos,1);
                        }

                        post.save(function (err) {
                            Post.findOne({'_id':data.id}).populate('likes').exec(function (err,post) {
                                socket.emit('returnPostLike',{'id': data.id,'amount':post.likes.length, 'likes':post.likes ,'state':state});
                            });
                       });
                    });
                });

                socket.on('deletePost', function(data){
                  Post.findOne({'_id':data.id}).exec(function (err, post){
                    socket.emit('hideDeletedPost',{'_id': post.id});
                    post.remove({'_id':post.id}, function (err, post){
                      if (err) throw err;

                      User.findOne({'_id':session.user._id}).populate('friendsSend friendsReceive').exec(function (err, user) {
                        for (var i=0; i<user.friendsReceive.length; i++) {
                          if (user.friendsReceive[i].userSendFollow == 1) {
                            if (typeof connectedUsers[user.friendsReceive[i].userSend] !== 'undefined') {
                              connectedUsers[user.friendsReceive[i].userSend].emit('hideDeletedPost',{'_id': post.id});
                            }
                          }
                        }
                        for (var j=0; j<user.friendsSend.length; j++) {
                          if (user.friendsSend[j].userReceiveFollow == 1) {
                            if (typeof connectedUsers[user.friendsSend[j].userReceive] !== 'undefined') {
                              connectedUsers[user.friendsSend[j].userReceive].emit('hideDeletedPost',{'_id': post.id});
                            }
                          }
                        }
                      });

                    });
                  });
                });

            }
        }

    });
};
