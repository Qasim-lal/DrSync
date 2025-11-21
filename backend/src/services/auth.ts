import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { getPrismaClient } from './prisma';
import { logger } from '../utils/logger';

const prisma = getPrismaClient();

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser extends Omit<User, 'password'> {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a single access token (for testing purposes)
   */
  generateAccessToken(payload: Partial<JWTPayload>): string {
    const fullPayload: JWTPayload = {
      userId: payload.userId!,
      organizationId: payload.organizationId!,
      role: payload.role!,
      email: payload.email || '',
    };

    return jwt.sign(
      fullPayload,
      this.jwtSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: 'drsync-api',
        audience: 'drsync-client',
      } as jwt.SignOptions
    );
  }

  /**
   * Generate JWT token pair (access + refresh)
   */
  generateTokenPair(user: AuthUser): TokenPair {
    const payload: JWTPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(
      payload, 
      this.jwtSecret, 
      {
        expiresIn: this.accessTokenExpiry,
        issuer: 'drsync-api',
        audience: 'drsync-client',
      } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'drsync-api',
        audience: 'drsync-client',
      } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'drsync-api',
        audience: 'drsync-client',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'drsync-api',
        audience: 'drsync-client',
      }) as { userId: string };

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<AuthUser | null> {
    try {
      // Find user with organization details
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        logger.warn(`Authentication attempt with invalid email: ${email}`);
        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn(`Authentication attempt with inactive user: ${email}`);
        return null;
      }

      // Check if organization is active
      if (!user.organization.isActive) {
        logger.warn(`Authentication attempt with inactive organization: ${user.organizationId}`);
        return null;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        logger.warn(`Authentication attempt with invalid password: ${email}`);
        return null;
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      
      logger.info(`User authenticated successfully: ${email}`);
      return userWithoutPassword as AuthUser;
    } catch (error) {
      logger.error('Authentication error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Get user by ID with organization details
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      });

      if (!user || !user.isActive || !user.organization.isActive) {
        return null;
      }

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as AuthUser;
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      // Verify refresh token
      const { userId } = this.verifyRefreshToken(refreshToken);

      // Get user details
      const user = await this.getUserById(userId);
      if (!user) {
        return null;
      }

      // Generate new token pair
      return this.generateTokenPair(user);
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Validate user permissions for a specific action
   */
  hasPermission(userRole: string, requiredRoles: string[]): boolean {
    // Define role hierarchy (higher roles inherit lower role permissions)
    const roleHierarchy: { [key: string]: number } = {
      'STAFF': 1,
      'RECEPTIONIST': 2,
      'NURSE': 3,
      'DOCTOR': 4,
      'ORG_ADMIN': 5,
      'SUPER_ADMIN': 6,
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role] || 999));

    return userRoleLevel >= requiredLevel;
  }

  /**
   * Generate secure random token for password reset, etc.
   */
  generateSecureToken(): string {
    return jwt.sign(
      { random: Math.random() },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Create a new user (for admin registration)
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    role?: string;
    phone?: string | null;
  }): Promise<AuthUser> {
    try {
      const hashedPassword = await this.hashPassword(userData.password);

      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase().trim(),
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          organizationId: userData.organizationId,
          role: (userData.role as any) || 'STAFF',
          phone: userData.phone || null,
          isActive: true,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      logger.info(`User created successfully: ${userData.email}`);
      return userWithoutPassword as AuthUser;
    } catch (error) {
      logger.error('User creation error:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, updateData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  }): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      const { password: _, ...userWithoutPassword } = user;
      logger.info(`User profile updated: ${user.email}`);
      return userWithoutPassword as AuthUser;
    } catch (error) {
      logger.error('Update user profile error:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          email: true,
        },
      });

      if (!user) {
        return false;
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return false;
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
        },
      });

      logger.info(`Password changed for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      throw new Error('Failed to change password');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
