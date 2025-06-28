const PrivatePost = require('../models/privatePostModel');
const User        = require('../models/userModel');

/* ──────────────────────────────────────────────────────────────
   helper ── generate a 7-character alphanumeric ID
   (62 possible chars → 62⁷ ≈ 3.5 trillion combinations)
----------------------------------------------------------------*/
const generateId = () => {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

/* ─────────────────────────  CREATE  ──────────────────────────
   POST /api/private-posts
----------------------------------------------------------------*/
exports.createPrivatePost = async (req, res) => {
  try {
    const { message, authorId, expiresIn } = req.body;

    if (!message || !authorId) {
      return res
        .status(400)
        .json({ error: 'Message and authorId are required' });
    }

    // optional expiry
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : null;

    // generate a unique 7-char code
    let uniqueId;
    while (true) {
      uniqueId = generateId();
      const exists = await PrivatePost.exists({ uniqueId });
      if (!exists) break; // found an unused ID
    }

    const newPrivatePost = await PrivatePost.create({
      message,
      authorId,
      uniqueId,
      expiresAt,
    });

    return res.status(201).json({ success: true, data: newPrivatePost });
  } catch (error) {
    console.error('Create private post error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/* ───────────────────────────  READ  ───────────────────────────
   GET /api/private-posts/:id
----------------------------------------------------------------*/
exports.getPrivatePost = async (req, res) => {
  try {
    const post = await PrivatePost.findOne({ uniqueId: req.params.id });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, error: 'Private post not found' });
    }

    const author = await User.findOne({ username: post.authorId });
    const postWithRole = {
      ...post.toObject(),
      authorRole: author?.role || 'user',
    };

    return res.status(200).json({ success: true, data: postWithRole });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/* ───────────────────────  READ-ALL (admin)  ───────────────────
   GET /api/private-posts?adminUsername=<admin>
----------------------------------------------------------------*/
exports.getAllPrivatePosts = async (req, res) => {
  try {
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
          as: 'authorDetails',
        },
      },
      { $unwind: { path: '$authorDetails', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          authorRole: { $ifNull: ['$authorDetails.role', 'user'] },
        },
      },
      { $project: { authorDetails: 0 } },
    ]);

    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/* ─────────────────────────  DELETE  ───────────────────────────
   DELETE /api/private-posts/:id
----------------------------------------------------------------*/
exports.deletePrivatePost = async (req, res) => {
  try {
    const post = await PrivatePost.findOne({ uniqueId: req.params.id });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, error: 'Post not found' });
    }

    const { userId, userRole } = req.body; // username or anonymousId

    // allow deletion if author or admin
    if (post.authorId !== userId && userRole !== 'admin') {
      return res.status(401).json({ error: 'User not authorized' });
    }

    await PrivatePost.deleteOne({ uniqueId: req.params.id });
    return res
      .status(200)
      .json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Delete private post error:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};
