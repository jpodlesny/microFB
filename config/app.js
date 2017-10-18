var express = require('express');

var path = require('path');
var less = require('less-middleware');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var expressLayouts = require('express-ejs-layouts');


// Passport.js
var passport = require('passport');
var passportLocal = require('passport-local');
var passportHttp = require('passport-http');

module.exports = function (app) {
	app.set('trust proxy', 1); // trust first proxy
	app.set('view engine', 'ejs');
	app.use(less(path.join(__dirname, '../src'), {
	    dest: path.join(__dirname, '../public')
	}));
	app.use(cookieParser());
	app.use(express.static(path.join(__dirname, '../public')));
	app.use(expressLayouts);
	app.set('layout', 'layouts/layout');
	app.use(bodyParser.urlencoded({
	    extended: false
	}));

	return app;
};
