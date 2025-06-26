const User = require('../models/userModel');
const Post = require('../models/postModel');

// @desc    Login or register a user
// @route   POST /api/users/login
exports.loginOrRegisterUser = async (req, res) => {
  const { username, nickname } = req.body;

  if (!username || !nickname) {
    return res.status(400).json({ error: 'Username and nickname are required' });
  }

  try {
    let user = await User.findOne({ username });

    if (user) {
      // User exists, log them in
      return res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
        },
      });
    } else {
      // User does not exist, register them
      if (username === 'harsh-admin') {
        return res.status(403).json({ error: 'Cannot register admin user this way.' });
      }
      
      const newUser = await User.create({
        username,
        nickname,
      });

      return res.status(201).json({
        success: true,
        data: {
          _id: newUser._id,
          username: newUser.username,
          nickname: newUser.nickname,
          role: newUser.role,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users/:adminUsername
exports.getAllUsers = async (req, res) => {
  try {
    const admin = await User.findOne({ username: req.query.adminUsername });

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const users = await User.find({}).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/users/:usernameToDelete
exports.deleteUser = async (req, res) => {
  const { usernameToDelete } = req.params;
  const adminUsername = req.query.adminUsername || req.body.adminUsername; // Admin username passed from frontend

  try {
    const admin = await User.findOne({ username: adminUsername });

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (admin.username === usernameToDelete) {
        return res.status(400).json({ error: 'Admins cannot delete their own accounts.' });
    }

    const userToDelete = await User.findOne({ username: usernameToDelete });
    if (!userToDelete) {
      return res.status(404).json({ error: 'User to delete not found' });
    }

    // Find all posts by the user
    const postsToAnonymize = await Post.find({ username: usernameToDelete });

    // Anonymize posts
    await Post.updateMany(
      { username: usernameToDelete },
      { $set: { username: `deleted_${Date.now()}`, nickname: 'Anonymous' } }
    );

    // Delete the user
    await User.deleteOne({ username: usernameToDelete });

    // Notify clients to refresh data
    req.io.emit('users_updated');
    req.io.emit('posts_updated');

    res.status(200).json({ success: true, message: 'User deleted and posts anonymized.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
