const Post = require('../models/postModel');
const User = require('../models/userModel');

// @desc    Delete a post
// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const user = await User.findOne({ username: req.body.username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Authorization check: allow deletion if user is the post author OR an admin.
    if (post.username !== user.username && user.role !== 'admin') {
      return res.status(401).json({ error: 'User not authorized' });
    }

    await Post.findByIdAndDelete(req.params.id);

    // Notify all clients that a post has been deleted
    req.io.emit('delete_post', { _id: req.params.id });

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'username',
          foreignField: 'username',
          as: 'authorDetails'
        }
      },
      {
        $unwind: {
          path: '$authorDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          authorRole: { $ifNull: ['$authorDetails.role', 'user'] }
        }
      },
      {
        $project: {
          authorDetails: 0
        }
      }
    ]);
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error('Error fetching posts with author role:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create a new post
// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { message, username, nickname } = req.body;

    if (!message || !username) {
      return res.status(400).json({ error: 'Message and username are required' });
    }

    const newPost = new Post({
      message,
      username,
      nickname: nickname || 'Anonymous',
    });

    await newPost.save();

    // enrich with author role
    const author = await User.findOne({ username });
    const postWithRole = { ...newPost.toObject(), authorRole: author?.role || 'user' };

    // emit to clients
    req.io.emit('new_post', postWithRole);

    res.status(201).json({ data: postWithRole });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Like or unlike a post
// @route   POST /api/posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const { likerId } = req.body; // This can be a username or an anonymousId

    if (!likerId) {
      return res.status(400).json({ success: false, error: 'Liker ID is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const index = post.likes.indexOf(likerId);

    if (index === -1) {
      // User has not liked the post yet, so add the like
      post.likes.push(likerId);
    } else {
      // User has already liked the post, so remove the like
      post.likes.splice(index, 1);
    }

    await post.save();

    // Notify all clients of the updated post
    // enrich with author role
    const author = await User.findOne({ username: post.username });
    const postWithRole = { ...post.toObject(), authorRole: author?.role || 'user' };

    req.io.emit('update_post', postWithRole);

    res.status(200).json({ success: true, data: postWithRole });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update a user's nickname across all their posts
// @route   PUT /api/posts/user/nickname
exports.updateNickname = async (req, res) => {
  try {
    const { username, newNickname } = req.body;

    if (!username || !newNickname) {
      return res.status(400).json({ success: false, error: 'Username and new nickname are required' });
    }

    // Update all posts by this user with the new nickname
    await Post.updateMany({ username }, { nickname: newNickname });

    // Fetch the updated posts to broadcast the changes
    const updatedPosts = await Post.find({ username });

    // Notify all clients of the updated posts
    updatedPosts.forEach(post => {
      req.io.emit('update_post', post);
    });

    res.status(200).json({ success: true, data: updatedPosts });
  } catch (error) {
    console.error('Update nickname error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
