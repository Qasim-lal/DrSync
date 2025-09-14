import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';
import { patientController } from '../controllers/patientController';

const router = Router();

// Apply authentication to all patient routes
router.use(authenticate);

/**
 * @route   GET /api/patients
 * @desc    Get patients list with pagination, search, and filtering
 * @access  STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
 * @query   ?page=1&limit=20&search=john&sortBy=firstName&sortOrder=asc
 */
router.get('/', 
  authorize(['STAFF', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.getPatients.bind(patientController) as any
);

/**
 * @route   GET /api/patients/stats
 * @desc    Get patient statistics and analytics
 * @access  DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
 */
router.get('/stats',
  authorize(['DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.getPatientStats.bind(patientController) as any
);

/**
 * @route   POST /api/patients
 * @desc    Create new patient
 * @access  NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
 */
router.post('/',
  authorize(['NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.createPatient.bind(patientController) as any
);

/**
 * @route   GET /api/patients/:id
 * @desc    Get single patient by ID
 * @access  STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
 * @note    Organization-scoped access enforced in controller
 */
router.get('/:id',
  authorize(['STAFF', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.getPatient.bind(patientController) as any
);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient information
 * @access  NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
 * @note    Organization-scoped access enforced in controller
 */
router.put('/:id',
  authorize(['NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.updatePatient.bind(patientController) as any
);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete patient (only if no appointments exist)
 * @access  ORG_ADMIN+, SUPER_ADMIN
 * @note    Organization-scoped access enforced in controller
 */
router.delete('/:id',
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  patientController.deletePatient.bind(patientController) as any
);

export default router;
