import { Router } from 'express';
import { libertarAssento, listarAssentos, reservarAssento } from '../controllers/assento.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirClienteOuOperadorEmpresa } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.get('/viagens/:viagemId/assentos', listarAssentos);
router.post('/viagens/:viagemId/assentos/:assentoId/reservar', exigirClienteOuOperadorEmpresa, reservarAssento);
router.delete('/viagens/:viagemId/assentos/:assentoId/reserva', exigirClienteOuOperadorEmpresa, libertarAssento);

export default router;
