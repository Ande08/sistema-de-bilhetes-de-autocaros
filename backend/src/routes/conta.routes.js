import { Router } from 'express';
import { obterResumo } from '../controllers/conta.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.get('/resumo', obterResumo);

export default router;
