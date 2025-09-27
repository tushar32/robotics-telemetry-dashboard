import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import logger from '../config/logger';
import { pool } from '../config/database';
import { generateToken, authenticateToken } from '../middleware/auth';
import { User, ApiResponse } from '../types';

const router = Router();

// POST /api/auth/login - User login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const client = await pool.connect();
    
    try {
      // Find user by username
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      const user: User = result.rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      const response: ApiResponse = {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        },
        message: 'Login successful'
      };

      res.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// POST /api/auth/register - User registration (admin only in production)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role = 'operator' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const client = await pool.connect();
    
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username or email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, role, created_at`,
        [username, email, passwordHash, role]
      );

      const newUser = result.rows[0];

      // Generate JWT token
      const token = generateToken({
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role
      });

      const response: ApiResponse = {
        success: true,
        data: {
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
          }
        },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, 'Registration error');
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
        [req.user?.userId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, 'Get user info error');
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching user info'
    });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Generate new token
    const newToken = generateToken({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role
    });

    res.json({
      success: true,
      data: { token: newToken },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Token refresh error');
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh'
    });
  }
});

export default router;
