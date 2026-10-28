import { Router } from 'express';
import { validarCupaoCompra } from '../controllers/cupao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirClienteOuOperadorEmpresa } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.post('/validar', exigirAutenticacao, exigirClienteOuOperadorEmpresa, validarCupaoCompra);

export default router;
