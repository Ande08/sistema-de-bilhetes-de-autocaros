import { Router } from 'express';
import { criarCompra, consultarBilhete, descarregarBilhetePdf, validarBilhetePublico } from '../controllers/purchase.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.get('/bilhete/:codigo/validar', validarBilhetePublico);
router.use(exigirAutenticacao);
router.post('/', criarCompra);
router.get('/bilhete/:codigo', consultarBilhete);
router.get('/bilhete/:codigo/pdf', descarregarBilhetePdf);

export default router;
