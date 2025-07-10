import { Router } from 'express';
import { CandidateController } from '../controllers/candidateController';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const candidateController = new CandidateController();

const candidateValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('district').notEmpty().withMessage('District is required'),
  body('office').notEmpty().withMessage('Office is required'),
];

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Invalid candidate ID'),
];

router.get('/', candidateController.getAll);
router.get('/:id', idValidation, validateRequest, candidateController.getById);
router.post('/', candidateValidation, validateRequest, candidateController.create);
router.put('/:id', idValidation, candidateValidation, validateRequest, candidateController.update);
router.delete('/:id', idValidation, validateRequest, candidateController.delete);

export default router;