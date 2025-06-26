const mongoose = require('mongoose');

const privatePostSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true,
  },
  authorId: {
    type: String,
    required: true, // This will store the username or anonymousId
  },
  expiresAt: {
    type: Date,
    default: null, // Stays forever if null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a TTL index on the expiresAt field.
// Documents will be automatically deleted when the expiresAt time is reached.
// This index only works on fields with a Date type.
privatePostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PrivatePost = mongoose.model('PrivatePost', privatePostSchema);

module.exports = PrivatePost;
