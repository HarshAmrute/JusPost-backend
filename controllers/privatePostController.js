const PrivatePost = require('../models/privatePostModel');
const User = require('../models/userModel');
const { randomUUID } = require('crypto');

// @desc    Create a new private post
// @route   POST /api/private-posts
exports.createPrivatePost = async (req, res) => {
  try {
    const { message, authorId, expiresIn } = req.body;

    if (!message || !authorId) {
      return res.status(400).json({ error: 'Message and authorId are required' });
    }

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn);
    }

    const uniqueId = randomUUID();

    const newPrivatePost = new PrivatePost({
      message,
      authorId,
      uniqueId,
      expiresAt,
    });

    await newPrivatePost.save();

    res.status(201).json({ success: true, data: newPrivatePost });
  } catch (error) {
    console.error('Create private post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get a private post by its unique ID
// @route   GET /api/private-posts/:id
exports.getPrivatePost = async (req, res) => {
  try {
    const post = await PrivatePost.findOne({ uniqueId: req.params.id });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Private post not found' });
    }

    const author = await User.findOne({ username: post.authorId });
    const postWithRole = { ...post.toObject(), authorRole: author?.role || 'user' };
    res.status(200).json({ success: true, data: postWithRole });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all private posts (Admin only)
// @route   GET /api/private-posts
exports.getAllPrivatePosts = async (req, res) => {
  try {
    // This is a simplified check. In a real app, you'd have more robust auth.
    const { adminUsername } = req.query;
    const adminUser = await User.findOne({ username: adminUsername });

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }

    const posts = await PrivatePost.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: 'username',
          as: 'authorDetails'
        }
      },
      { $unwind: { path: '$authorDetails', preserveNullAndEmptyArrays: true } },
      { $addFields: { authorRole: { $ifNull: ['$authorDetails.role', 'user'] } } },
      { $project: { authorDetails: 0 } }
    ]);
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete a private post
// @route   DELETE /api/private-posts/:id
exports.deletePrivatePost = async (req, res) => {
  try {
    const post = await PrivatePost.findOne({ uniqueId: req.params.id });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const { userId, userRole } = req.body; // Can be username or anonymousId

    // Authorization check: allow deletion if user is the post author OR an admin.
    if (post.authorId !== userId && userRole !== 'admin') {
      return res.status(401).json({ error: 'User not authorized' });
    }

    await PrivatePost.deleteOne({ uniqueId: req.params.id });

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Delete private post error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
