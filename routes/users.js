const express = require('express');
const router = express.Router();
const { 
  loginOrRegisterUser, 
  getAllUsers, 
  deleteUser, 
  updateMyNickname, 
  deleteMyAccount 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Public route for login/registration
router.post('/login', loginOrRegisterUser);

// Routes for a logged-in user to manage their own account
// These are protected by the 'protect' middleware
router.put('/me/nickname', protect, updateMyNickname);
router.delete('/me', protect, deleteMyAccount);

// --- Admin Routes ---

// Admin gets all users
router.get('/', getAllUsers); 

// Admin deletes a specific user
router.delete('/:usernameToDelete', deleteUser); 

module.exports = router;
