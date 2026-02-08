const User = require('../models/User');

const getProfile = async (req, res) => { 
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
};

const updateProfile = async (req, res) => { 
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        message: 'Name is required' 
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    user.name = name;
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
};

module.exports = { getProfile, updateProfile };