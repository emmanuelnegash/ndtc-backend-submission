import { Router } from 'express';
import { VolunteerController } from '../controllers/volunteerController';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const volunteerController = new VolunteerController();

const volunteerValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').notEmpty().withMessage('Role is required'),
];

router.get('/', volunteerController.getAll);
router.post('/', volunteerValidation, validateRequest, volunteerController.create);
router.put('/:id', volunteerValidation, validateRequest, volunteerController.update);

export default router; 