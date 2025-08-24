import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/providers
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Provider management endpoints not implemented yet',
    endpoint: 'GET /api/providers',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// POST /api/providers
router.post('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Provider management endpoints not implemented yet',
    endpoint: 'POST /api/providers',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// GET /api/providers/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Provider management endpoints not implemented yet',
    endpoint: `GET /api/providers/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// PUT /api/providers/:id
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Provider management endpoints not implemented yet',
    endpoint: `PUT /api/providers/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// DELETE /api/providers/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Provider management endpoints not implemented yet',
    endpoint: `DELETE /api/providers/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

export default router;
