import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const attendanceController = new AttendanceController();

const attendanceValidation = [
  body('eventId').isInt().withMessage('Event is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
];

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Valid attendance ID is required'),
];

router.get('/', attendanceController.getAll);
router.get('/:id', idValidation, validateRequest, attendanceController.getOne);
router.post('/', attendanceValidation, validateRequest, attendanceController.create);
router.put('/:id', idValidation, attendanceValidation, validateRequest, attendanceController.update);
router.delete('/:id', idValidation, validateRequest, attendanceController.delete);

export default router;