import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { authService } from '../services/auth';
import { logger } from '../utils/logger';
import {
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateUpdateProfile,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '../utils/validation/auth';

const router = Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Account temporarily locked. Please try again in 15 minutes',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', loginLimiter, validateLogin, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, remember }: LoginRequest = req.body;

  try {
    // Authenticate user
    const user = await authService.authenticateUser(email, password);
    
    if (!user) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token pair
    const tokens = authService.generateTokenPair(user);

    // Set secure HTTP-only cookie for refresh token if remember option is selected
    if (remember) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh'
      });
    }

    logger.info(`User logged in successfully: ${user.email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          organization: user.organization,
          lastLoginAt: user.lastLoginAt,
          emailVerified: user.emailVerified,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Login process failed',
      code: 'AUTH_LOGIN_ERROR'
    });
  }
}));

/**
 * POST /api/auth/register
 * Register a new user (typically used by org admins or during setup)
 */
router.post('/register', authLimiter, validateRegister, asyncHandler(async (req: Request, res: Response) => {
  const userData: RegisterRequest = req.body;
  const createUserData = {
    ...userData,
    phone: userData.phone || null
  };

  try {
    // Create new user
    const user = await authService.createUser(createUserData);

    // Generate JWT token pair
    const tokens = authService.generateTokenPair(user);

    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: user.organization,
        },
        tokens,
      },
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    
    // Handle duplicate email error
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({
        success: false,
        error: 'Registration failed',
        message: 'An account with this email already exists',
        code: 'AUTH_EMAIL_EXISTS'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Registration process failed',
      code: 'AUTH_REGISTRATION_ERROR'
    });
  }
}));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: { refreshToken?: string } = req.body;
  
  // Also check for refresh token in HTTP-only cookie
  const cookieRefreshToken = req.cookies?.refreshToken;
  const tokenToUse = refreshToken || cookieRefreshToken;

  if (!tokenToUse) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token required',
      message: 'No refresh token provided',
      code: 'AUTH_REFRESH_TOKEN_MISSING'
    });
  }

  try {
    const tokens = await authService.refreshAccessToken(tokenToUse);
    
    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token',
        code: 'AUTH_REFRESH_TOKEN_INVALID'
      });
    }

    // Update refresh token cookie if it was used
    if (cookieRefreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh'
      });
    }

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Token refresh process failed',
      code: 'AUTH_REFRESH_ERROR'
    });
  }
}));

/**
 * POST /api/auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    // Clear refresh token cookie if present
    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh'
    });

    // In a production system, you would typically:
    // 1. Add the access token to a blacklist/revocation list
    // 2. Remove refresh token from database if stored
    // For now, we'll just clear the cookie and respond

    logger.info(`User logged out: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Logout successful',
      data: null,
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Logout process failed',
      code: 'AUTH_LOGOUT_ERROR'
    });
  }
}));

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          organization: user.organization,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          mfaEnabled: user.mfaEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error', 
      message: 'Failed to retrieve user profile',
      code: 'AUTH_PROFILE_ERROR'
    });
  }
}));

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', authenticate, validateUpdateProfile, asyncHandler(async (req: Request, res: Response) => {
  const updateData: UpdateProfileRequest = req.body;
  const userId = req.user!.id;
  const cleanUpdateData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  } = {};
  
  if (updateData.firstName) cleanUpdateData.firstName = updateData.firstName;
  if (updateData.lastName) cleanUpdateData.lastName = updateData.lastName;
  if (updateData.phone) cleanUpdateData.phone = updateData.phone;
  if (updateData.avatar) cleanUpdateData.avatar = updateData.avatar;

  try {
    const updatedUser = await authService.updateUserProfile(userId, cleanUpdateData);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile could not be updated',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    logger.info(`User profile updated: ${updatedUser.email}`);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update user profile',
      code: 'AUTH_UPDATE_PROFILE_ERROR'
    });
  }
}));

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, validateChangePassword, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
  const userId = req.user!.id;

  try {
    const success = await authService.changePassword(userId, currentPassword, newPassword);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Password change failed',
        message: 'Current password is incorrect',
        code: 'AUTH_CURRENT_PASSWORD_INVALID'
      });
    }

    logger.info(`Password changed for user: ${req.user!.email}`);

    return res.json({
      success: true,
      message: 'Password changed successfully',
      data: null,
    });
  } catch (error) {
    logger.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to change password',
      code: 'AUTH_CHANGE_PASSWORD_ERROR'
    });
  }
}));

/**
 * GET /api/auth/verify-token
 * Verify if the current access token is valid
 */
router.get('/verify-token', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      valid: true,
      expiresIn: '15m', // This should be calculated from the actual token
    },
  });
}));

export default router;
