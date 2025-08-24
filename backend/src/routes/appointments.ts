import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/appointments
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Appointment management endpoints not implemented yet',
    endpoint: 'GET /api/appointments',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// POST /api/appointments
router.post('/', asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Appointment management endpoints not implemented yet',
    endpoint: 'POST /api/appointments',
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// GET /api/appointments/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Appointment management endpoints not implemented yet',
    endpoint: `GET /api/appointments/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// PUT /api/appointments/:id
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Appointment management endpoints not implemented yet',
    endpoint: `PUT /api/appointments/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

// DELETE /api/appointments/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Appointment management endpoints not implemented yet',
    endpoint: `DELETE /api/appointments/${req.params.id}`,
    status: 'Coming in Phase 2 - Backend API Development',
  });
}));

export default router;
