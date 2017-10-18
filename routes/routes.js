var express = require('express');
var router = express.Router();
// Model Mongoose reprezentujący uzytkownika
var User = require('./../models/user');
var Post = require('./../models/post');
var FriendRequest = require('./../models/friendRequest');

var passport = require('./../config/passport');
var moment = require('moment');

// Routing aplikacji
router.get('/', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('main/index', {
            isAuthenticated: req.isAuthenticated(),
            user: req.session.user,
            user2: req.session.user,
            includeJs: ['socketWall'],
            myWall: true,
            'moment':moment
        });
    }else{
        res.render('account/login');
    }
});


// redirect nie zalogowanego
router.use(function(req, res, next) {
    var url = req.url;
    if (req.user === undefined & (url != '/register' & url != '/login') ){
        res.redirect('/');
    }else{
        next();
    }
});

router.get('/user/:id', function (req, res) {
    var tmp = {'_id':req.params.id};
    res.render('main/index', {
        isAuthenticated: req.isAuthenticated(),
        user: tmp,
        user2: req.session.user,
        includeJs: ['socketWall'],
        'moment':moment
    });
});

router.get('/friendRequests', function (req, res) {
    res.render('main/friendrequestList', {
      isAuthenticated: req.isAuthenticated(),
      user: req.params,
      user2: req.session.user
    });
});

router.get('/chat/:id', function (req, res) {
    var tmp = {'_id':req.params.id};
    var arr = req.params.id.split(',');
    FriendRequest.find(
        {$or:[
            {'userSend':req.session.user._id,'userReceive':{$in:arr}},
            {'userReceive':req.session.user._id,'userSend':{$in:arr}}
            ]}
        ).exec(function(err, friendrequest) {
          if (friendrequest.length == arr.length) {
            res.render('main/chat', {
                isAuthenticated: req.isAuthenticated(),
                user: tmp,
                user2: req.session.user,
                includeJs: ['socketChat'],
                'moment':moment
            });
          } else {
            res.redirect('/');
          }
      });

});

router.get('/chats', function (req, res) {
    res.render('main/chatList', {
      isAuthenticated: req.isAuthenticated(),
      user: req.params,
      user2: req.session.user,
      includeJs: ['socketChatList']
    });
});


router.get('/login', function (req, res) {
    res.render('account/login');
});

onlineUsers=[];

router.post('/login', passport.authenticate('local'), function (req, res) {
    req.session.user = req.user;
    User.findOne({'_id':req.session.user._id}).exec(function (err, user) {
      user.update({'online':true},{'online':false}).exec(function (err, updated) {
        onlineUsers.push(String(user._id));
        io.of('/friendRequest').emit('showOnlineUser',{'id':req.session.user._id});
          res.redirect('/');
      });
    });

});

router.get('/register', function (req, res) {
   res.render('account/registration');
});

router.post('/register', function (req, res) {
    var tmp = new User(req.body);

    User.findOne({'username':req.body.username}).exec(function (err, user) {

      if (user == null) {
        if (req.body.password == req.body.password2) {
          tmp.password = passport.md5(req.body.password);
          tmp.save(function (err) {
            if (err) {
              res.redirect('/register');
            }else{
              res.redirect('/login');
            }
          });
        } else {
          res.render('account/registration', {
            error: "PODANE HASŁA SĄ RÓŻNE"
          });
        }
      } else {
        res.render('account/registration', {
          error: "PODANA NAZWA UŻYTKOWNIKA JUŻ ISTNIEJE"
        });
      }
    });
});

router.get('/logout', function (req, res) {
    io.of('/friendRequest').emit('showOfflineUser',{'id':req.session.user._id});
    req.logout();
    User.findOne({'_id':req.session.user._id}).exec(function (err, user) {
      user.update({'online':false},{'online':true}).exec(function (err, updated) {
        var index = onlineUsers.indexOf(String(user._id));
        if (index > -1) {
          onlineUsers.splice(index, 1);
          console.log(onlineUsers);
        }
        res.redirect('/');
      });
    });
});

module.exports = router;
