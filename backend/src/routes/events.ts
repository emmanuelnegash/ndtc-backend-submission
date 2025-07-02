import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const eventController = new EventController();

const eventValidation = [
  body('candidateId').isInt().withMessage('Valid candidate ID is required'),
  body('name').notEmpty().withMessage('Event name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required'),
];

router.get('/', eventController.getAll);
router.post('/', eventValidation, validateRequest, eventController.create);
router.put('/:id', eventValidation, validateRequest, eventController.update);

export default router;