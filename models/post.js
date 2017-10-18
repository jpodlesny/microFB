/*jshint node: true */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var relationship = require("mongoose-relationship");

var postSchema = new Schema({
    content: String,
    owner: { type:Schema.ObjectId, ref:"User", childPath:"wall" },
    author: { type:Schema.ObjectId, ref:"User", childPath:"wall" },
    likes: [{ type:Schema.ObjectId, ref:"User", childPath:"liked"}],
    created: { type: Date, default: Date.now },
    share: Boolean
});
postSchema.plugin(relationship, { relationshipPathName:'owner' });
postSchema.plugin(relationship, { relationshipPathName:'likes' });
postSchema.plugin(relationship, { relationshipPathName:'author' });

module.exports = mongoose.model("Post", postSchema);
