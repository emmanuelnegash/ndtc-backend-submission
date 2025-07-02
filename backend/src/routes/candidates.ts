import { Router } from 'express';
import { CandidateController } from '../controllers/candidateController';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const candidateController = new CandidateController();

const candidateValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('district').notEmpty().withMessage('District is required'),
  body('office').notEmpty().withMessage('Office is required'),
];

router.get('/', candidateController.getAll);
router.get('/:id', candidateController.getById);
router.post('/', candidateValidation, validateRequest, candidateController.create);
router.put('/:id', candidateValidation, validateRequest, candidateController.update);

export default router;