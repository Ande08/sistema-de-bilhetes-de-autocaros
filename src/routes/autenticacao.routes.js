import { Router } from 'express';
import { iniciarSessao, registar } from '../controllers/autenticacao.controller.js';

const router = Router();
router.post('/registar', registar);
router.post('/iniciar-sessao', iniciarSessao);

export default router;
