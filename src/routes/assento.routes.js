import { Router } from 'express';
import { listarAssentos } from '../controllers/assento.controller.js';

const router = Router();
router.get('/viagens/:viagemId/assentos', listarAssentos);

export default router;
