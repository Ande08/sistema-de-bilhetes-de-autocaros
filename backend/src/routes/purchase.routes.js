import { Router } from 'express';
import { criarCompra, consultarBilhete } from '../controllers/purchase.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.post('/', criarCompra);
router.get('/bilhete/:codigo', consultarBilhete);

export default router;
