const express = require('express');
const router = express.Router();
const { loginOrRegisterUser, getAllUsers, deleteUser } = require('../controllers/userController');

// Route to register a new user
router.post('/login', loginOrRegisterUser);

// Route to get all users
router.get('/', getAllUsers); // Admin gets all users

// Route to delete a user
router.delete('/:usernameToDelete', deleteUser); // Admin deletes a user

module.exports = router;
