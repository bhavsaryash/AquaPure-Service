import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const signToken = user =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const handleValidation = req => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0].msg);
    err.statusCode = 400;
    throw err;
  }
};

export const register = async (req, res, next) => {
  try {
    handleValidation(req);
    const { name, email, phone, password, role = 'client' } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role
    });

    // If the user is registering as employee/technician, auto-create Employee profile
    if (role === 'employee' || role === 'technician') {
      try {
        const Employee = (await import('../models/Employee.js')).default;

        const employeeCount = await Employee.countDocuments();
        const employeeId = `EMP${String(employeeCount + 1).padStart(3, '0')}`;

        await Employee.create({
          user: user._id,
          employeeId,
          specialization: 'General Service',
          experience: 0,
          location: '',
          salary: 0,
          performance: {
            completedServices: 0,
            averageRating: 0,
            monthlyTarget: 0,
            monthlyCompleted: 0
          }
        });
      } catch (e) {
        console.error('Failed to auto-create Employee profile for user:', user._id, e.message);
        // Do not block registration if employee profile creation fails
      }
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    handleValidation(req);
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST api/auth/forgot-password
// @desc    Forgot password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const origins =
      process.env.CLIENT_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || [];
    const clientBase = (
      process.env.CLIENT_APP_URL?.trim() ||
      origins[0] ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
    const resetUrl = `${clientBase}/reset-password?token=${resetToken}`;
    console.log('GENERATED RESET LINK:', resetUrl);


    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      const info = await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      let responseData = 'Email sent';
      let devLink = resetUrl; // Always sending link for dev convenience since user requested it

      res.status(200).json({
        success: true,
        data: responseData,
        resetUrl: devLink
      });
    } catch (err) {
      console.error('Email send failed:', err.message);

      // Fallback if SMTP fails
      return res.status(200).json({
        success: true,
        data: 'Unable to send email. Click the link below to reset your password:',
        resetToken: resetToken,
        resetUrl: resetUrl
      });
    }
  } catch (err) {
    next(err);
  }
};

// @route   PUT api/auth/reset-password/:resettoken
// @desc    Reset password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Set new password
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    user.password = await bcrypt.hash(req.body.password, saltRounds);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, data: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @route   GET api/auth/me
// @desc    Get current logged in user profile
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @route   PUT api/auth/updatedetails
// @desc    Update user profile details
// @access  Private
export const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      roDetails: req.body.roDetails
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]);

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};



