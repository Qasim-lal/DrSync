import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AppointmentController } from '../controllers/appointmentController';

const router = Router();
const appointmentController = new AppointmentController();

// Apply authentication to all appointment routes
router.use(authenticate);

// GET /api/appointments - List appointments with pagination and filtering
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/', 
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getAppointments.bind(appointmentController))
);

// POST /api/appointments - Create new appointment
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.post('/',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.createAppointment.bind(appointmentController))
);

// GET /api/appointments/:id - Get single appointment
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/:id',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getAppointment.bind(appointmentController))
);

// PUT /api/appointments/:id - Update appointment
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.put('/:id',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.updateAppointment.bind(appointmentController))
);

// DELETE /api/appointments/:id - Cancel appointment (soft delete)
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.delete('/:id',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.deleteAppointment.bind(appointmentController))
);

// POST /api/appointments/:id/confirm - Confirm appointment
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.post('/:id/confirm',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.confirmAppointment.bind(appointmentController))
);

// Scheduling endpoints
// GET /api/appointments/availability/:providerId - Get available time slots for a provider
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/availability/:providerId',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getAvailableSlots.bind(appointmentController))
);

// GET /api/appointments/next-available/:providerId - Find next available slot for a provider
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/next-available/:providerId',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getNextAvailableSlot.bind(appointmentController))
);

// GET /api/appointments/schedule/:providerId - Get provider's schedule for a date range
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/schedule/:providerId',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getProviderSchedule.bind(appointmentController))
);

// GET /api/appointments/stats/:providerId - Get appointment statistics for a provider
// Roles: DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/stats/:providerId',
  authorize(['DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getAppointmentStats.bind(appointmentController))
);

// GET /api/appointments/suggestions/:providerId - Get suggested appointment times for a provider
// Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
router.get('/suggestions/:providerId',
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  asyncHandler(appointmentController.getSuggestedTimes.bind(appointmentController))
);

export default router;
