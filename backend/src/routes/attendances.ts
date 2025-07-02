import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const attendanceController = new AttendanceController();

const attendanceValidation = [
  body('eventId').isInt().withMessage('Event is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
];

router.get('/', attendanceController.getAll);
router.post('/', attendanceValidation, validateRequest, attendanceController.create);
router.delete('/:id', attendanceController.delete);

export default router; 