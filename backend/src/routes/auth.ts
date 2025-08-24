import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Authentication endpoints not implemented yet',
    endpoint: 'POST /api/auth/login',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Authentication endpoints not implemented yet',
    endpoint: 'POST /api/auth/logout',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Authentication endpoints not implemented yet',
    endpoint: 'POST /api/auth/refresh',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Authentication endpoints not implemented yet',
    endpoint: 'GET /api/auth/me',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

export default router;
