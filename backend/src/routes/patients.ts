import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/patients
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Patient management endpoints not implemented yet',
    endpoint: 'GET /api/patients',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// POST /api/patients
router.post('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Patient management endpoints not implemented yet',
    endpoint: 'POST /api/patients',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// GET /api/patients/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Patient management endpoints not implemented yet',
    endpoint: `GET /api/patients/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// PUT /api/patients/:id
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Patient management endpoints not implemented yet',
    endpoint: `PUT /api/patients/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// DELETE /api/patients/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Patient management endpoints not implemented yet',
    endpoint: `DELETE /api/patients/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

export default router;
