import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, forgotPassword, resetPassword, getMe, updateDetails } from '../controllers/authController.js';
import protect from '../middleware/auth.js';

const router = Router();

const emailValidator = body('email').isEmail().withMessage('Valid email is required');
const passwordValidator = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters');

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    emailValidator,
    body('phone').notEmpty().withMessage('Phone number is required'),
    passwordValidator,
    body('role')
      .optional()
      .isIn(['client', 'employee', 'admin'])
      .withMessage('Invalid role')
  ],
  register
);

router.post('/login', [emailValidator, passwordValidator], login);
router.post('/forgot-password', [emailValidator], forgotPassword);
router.put('/reset-password/:resettoken', [passwordValidator], resetPassword);

router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);

export default router;


