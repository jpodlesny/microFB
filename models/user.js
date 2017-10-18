/*jshint node: true */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var relationship = require("mongoose-relationship");
var bcrypt = require('bcryptjs');

var userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    friendsSend:[{ type:Schema.ObjectId, ref:"FriendRequest", childPath:"userSend" }],
    friendsReceive:[{ type:Schema.ObjectId, ref:"FriendRequest", childPath:"userReceive" }],
    wall:[{ type:Schema.ObjectId, ref:"Post" }],
    liked:[{ type:Schema.ObjectId, ref:"Post" }],
    chats:[{ type:Schema.ObjectId, ref:"Chat" }],
    online: { type: Boolean, ref: false },
    created: { type: Date, default: Date.now }
});

userSchema.plugin(relationship, { relationshipPathName:'friendsSend' });
userSchema.plugin(relationship, { relationshipPathName:'friendsReceive' });


module.exports = mongoose.model("User", userSchema);
