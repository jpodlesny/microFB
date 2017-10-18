/*jshint node: true */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var relationship = require("mongoose-relationship");

var chatSchema = new Schema({
    content: [{ type:Schema.ObjectId, ref:"Message" }],
    users: [{ type:Schema.ObjectId, ref:"User", childPath:"chats" }],
    read: [{ type:Schema.ObjectId, ref:"User" }], //-------------------------------------------------------------------------------------
    created: { type: Date, default: Date.now }
});

chatSchema.plugin(relationship, { relationshipPathName:'users' });

module.exports = mongoose.model("Chat", chatSchema);
