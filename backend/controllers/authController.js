// contract/backend/controllers/authController.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
const registerUser = async (req, res) => {
  const { name, username, password, role, assignedSites } = req.body;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      username,
      password, // Password will be hashed by pre-save hook in User model
      role,
      assignedSites: role === 'supervisor' && assignedSites ? assignedSites : [],
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        assignedSites: user.assignedSites,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  // --- TEMPORARY DEVELOPMENT LOGIN ---
  const DEV_ADMIN_ID = '60d5ec49f5e2a3001c8f1f8a'; // Using a valid ObjectId format
  const DEV_SUPERVISOR_ID = '60d5ec49f5e2a3001c8f1f8b'; // Using a valid ObjectId format

  if (
    username === process.env.DEV_ADMIN_USERNAME &&
    password === process.env.DEV_ADMIN_PASSWORD
  ) {
    const devAdminUser = { _id: DEV_ADMIN_ID, name: 'Dev Admin', username: username, role: 'admin', assignedSites: [] };
    return res.json({
      user: devAdminUser,
      token: generateToken(devAdminUser._id, devAdminUser.role),
    });
  }

  if (
    username === process.env.DEV_SUPERVISOR_USERNAME &&
    password === process.env.DEV_SUPERVISOR_PASSWORD
  ) {
    const devSupervisorUser = { _id: DEV_SUPERVISOR_ID, name: 'Dev Supervisor', username: username, role: 'supervisor', assignedSites: [] };
    return res.json({
      user: devSupervisorUser,
      token: generateToken(devSupervisorUser._id, devSupervisorUser.role),
    });
  }
  // --- END TEMPORARY DEVELOPMENT LOGIN ---

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          assignedSites: user.assignedSites,
        },
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user profile (for logged in user)
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      assignedSites: user.assignedSites,
    });
  } else if (req.user) {
    // If it's a dev user from the middleware, just return that info.
    res.json(req.user);
  }
  else {
    res.status(404).json({ message: 'User not found' });
  }
};


// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  const { name, username, password, role, assignedSites } = req.body;
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = name || user.name;
      user.username = username || user.username;
      user.role = role || user.role;
      user.assignedSites = role === 'supervisor' && assignedSites ? assignedSites : [];

      if (password) {
        user.password = password; // Hashing will happen in pre-save hook
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        role: updatedUser.role,
        assignedSites: updatedUser.assignedSites,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { registerUser, loginUser, getUserProfile, getAllUsers, updateUser, deleteUser };