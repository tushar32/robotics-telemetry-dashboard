import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { createSigner, createVerifier } from 'fast-jwt';
import { JWTPayload } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Create reusable verifier
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
const verifier = createVerifier({ key: jwtSecret });

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = verifier(token) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn({ err: error }, 'JWT verification failed');
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Create reusable signer
const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
const signer = createSigner({ key: jwtSecret, expiresIn });

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return signer(payload);
};

export const verifySocketToken = (token: string): JWTPayload | null => {
  try {
    return verifier(token) as JWTPayload;
  } catch (error) {
    logger.warn({ err: error }, 'Socket JWT verification failed');
    return null;
  }
};
