import { Router } from 'express';
import { listarClientes } from '../controllers/atendimento.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAtendenteOuAdministrador } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao, exigirAtendenteOuAdministrador);
router.get('/clientes', listarClientes);

export default router;
