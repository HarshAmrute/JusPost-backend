const express = require('express');
const router = express.Router();
const {
  getPosts,
  createPost,
  likePost,
  deletePost,
  updateNickname
} = require('../controllers/postController');

router.get('/', getPosts);
router.post('/', createPost);
router.delete('/:id', deletePost);
router.post('/:id/like', likePost);
router.put('/user/nickname', updateNickname);

module.exports = router;
