const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  nickname: {
    type: String,
    required: true,
  },
  likes: {
    type: [String], // Array of user/anonymous IDs
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
