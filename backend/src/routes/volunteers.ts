import { Router } from 'express';
import { VolunteerController } from '../controllers/volunteerController';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const volunteerController = new VolunteerController();

const volunteerValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').notEmpty().withMessage('Role is required'),
];

const idValidation = [param('id').isInt({ gt: 0 }).withMessage('Valid volunteer ID is required')];

router.get('/', volunteerController.getAll);
router.get('/:id', idValidation, validateRequest, volunteerController.getOne);
router.post('/', volunteerValidation, validateRequest, volunteerController.create);
router.put('/:id', idValidation, volunteerValidation, validateRequest, volunteerController.update);
router.delete('/:id', idValidation, validateRequest, volunteerController.delete);

export default router;
