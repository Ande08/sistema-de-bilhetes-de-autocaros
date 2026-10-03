import { Router } from 'express';
import { criarCompra, consultarBilhete } from '../controllers/purchase.controller.js';

const router = Router();
router.post('/', criarCompra);
router.get('/bilhete/:codigo', consultarBilhete);

export default router;
