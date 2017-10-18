var User = require('./../models/user');
// Passport.js
var passport = require('passport');
var passportLocal = require('passport-local');
var passportHttp = require('passport-http');

var crypto = require('crypto');
var md5 = function(text){
	return crypto.createHash('md5').update(text).digest("hex");
};

// Używamy Passport.js
var validateUser = function (username, password, done){
    User.findOne({username: username}, function (err, user) {
        if (err) { done(err); }
        if (user) {
            if (user.password === md5(password)) {
                done(null, user);
            } else {
                done(null, null);
            }
        } else { done(null, null); }
    });
};
// Konfiguracja Passport.js
passport.use(new passportLocal.Strategy(validateUser));
passport.use(new passportHttp.BasicStrategy(validateUser));
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {

    User.findOne({"_id": id}, function (err, user) {
        if (err) { done(err); }
        if (user) {
            done(null, {
                id: user._id,
                username: user.username,
                password: user.password
            });
        } else {
            done({ msg: 'Nieznany ID' });
        }
    });
});


module.exports = passport;

module.exports.validateUser = validateUser;
module.exports.md5 = md5;
