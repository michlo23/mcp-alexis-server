import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Middleware to validate AlexisHR JWT tokens
 * Extracts the JWT token from the Authorization header and attaches it to the request object
 */
export const validateJwtToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    // Check if auth header exists and has the Bearer token format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required. Missing or invalid JWT token.'
        },
        id: null
      });
    }
    
    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];
    
    // Attach the token to the request for later use
    // We're not verifying the token structure here, just ensuring it exists
    // The actual API calls to AlexisHR will use this token
    (req as any).jwtToken = token;
    
    next();
  } catch (error) {
    console.error('JWT Authentication error:', error);
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Authentication failed.'
      },
      id: null
    });
  }
};

/**
 * Gets the JWT token from the request object
 * @param req Express request object
 * @returns JWT token string or null if not found
 */
export const getJwtToken = (req: Request): string | null => {
  return (req as any).jwtToken || null;
};
