/*jshint node: true */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var relationship = require("mongoose-relationship");

var messageSchema = new Schema({
    content: String,
    author: { type:Schema.ObjectId, ref:"User" },
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);
