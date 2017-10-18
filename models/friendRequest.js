/*jshint node: true */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var relationship = require("mongoose-relationship");

var friendRequestSchema = new Schema({
    userSend: { type:Schema.ObjectId, ref:"User", childPath:"friendsSend" },
    userReceive: { type:Schema.ObjectId, ref:"User", childPath:"friendsReceive" },
    // 0 wyslano zaproszenie, 1 znajomi
    status: { type: Number, min: 0, max: 1, default: 0 },
    // 0 nie obserwuje, 1 obserwuje
    userSendFollow: { type: Number, min: 0, max: 1, default: 0 },
    userReceiveFollow: { type: Number, min: 0, max: 1, default: 0 },
    created: { type: Date, default: Date.now }
});

friendRequestSchema.plugin(relationship, { relationshipPathName:'userSend' });
friendRequestSchema.plugin(relationship, { relationshipPathName:'userReceive' });

module.exports = mongoose.model("FriendRequest", friendRequestSchema);
