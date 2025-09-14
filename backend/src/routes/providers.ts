import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';
import {
  getProviders,
  createProvider,
  getProvider,
  updateProvider,
  deleteProvider,
  getProviderAvailability,
  getProviderAnalytics
} from '../controllers/providerController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/providers/analytics - Provider analytics (must be before /:id route)
router.get('/analytics', 
  authorize(['ORG_ADMIN', 'DOCTOR']),
  getProviderAnalytics
);

// GET /api/providers - Get all providers
router.get('/', 
  authorize(['ORG_ADMIN', 'DOCTOR', 'NURSE', 'STAFF']),
  getProviders
);

// POST /api/providers - Create new provider
router.post('/', 
  authorize(['ORG_ADMIN']),
  createProvider
);

// GET /api/providers/:id - Get provider by ID
router.get('/:id', 
  authorize(['ORG_ADMIN', 'DOCTOR', 'NURSE', 'STAFF']),
  getProvider
);

// PUT /api/providers/:id - Update provider
router.put('/:id', 
  authorize(['ORG_ADMIN']),
  updateProvider
);

// DELETE /api/providers/:id - Soft delete provider
router.delete('/:id', 
  authorize(['ORG_ADMIN']),
  deleteProvider
);

// GET /api/providers/:id/availability - Get provider availability
router.get('/:id/availability', 
  authorize(['ORG_ADMIN', 'DOCTOR', 'NURSE', 'STAFF']),
  getProviderAvailability
);

export default router;
