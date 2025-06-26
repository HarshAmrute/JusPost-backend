const express = require('express');
const router = express.Router();
const {
  createPrivatePost,
  getPrivatePost,
  getAllPrivatePosts,
  deletePrivatePost,
} = require('../controllers/privatePostController');

// Route to create a new private post
router.post('/', createPrivatePost);

// Route to get all private posts (for admin)
router.get('/', getAllPrivatePosts);

// Route to get a single private post by its unique ID
router.get('/:id', getPrivatePost);

// Route to delete a private post
router.delete('/:id', deletePrivatePost);

module.exports = router;
