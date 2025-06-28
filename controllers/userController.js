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
// @route   GET /api/users
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

// @desc    Update user's own nickname
// @route   PUT /api/users/me/nickname
exports.updateMyNickname = async (req, res) => {
  try {
    // req.user.id is added by the 'protect' middleware
    const { newNickname } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update nickname in User model
    user.nickname = newNickname;
    await user.save();
    
    // Update nickname in all their posts
    await Post.updateMany({ username: user.username }, { nickname: newNickname });

    req.io.emit('posts_updated'); // Notify clients to refresh posts

    res.json({ success: true, data: { nickname: newNickname } });
  } catch (error) {
    console.error('Update nickname error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete user's own account
// @route   DELETE /api/users/me
exports.deleteMyAccount = async (req, res) => {
  try {
    // req.user.id is added by the 'protect' middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Admins cannot delete their accounts this way.' });
    }

    // Anonymize user's posts
    await Post.updateMany(
      { username: user.username },
      { $set: { username: `deleted_${Date.now()}`, nickname: 'Anonymous' } }
    );

    // Delete the user
    await User.deleteOne({ _id: req.user.id });

    req.io.emit('posts_updated'); // Notify clients to refresh posts

    res.status(200).json({ success: true, message: 'Account deleted and posts anonymized.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
