import { Router } from 'express';
import { abrirTicket, atribuir, consultarAssistente, enviarMensagem, mudarEstado, obterGestores, obterTicket, obterTickets } from '../controllers/suporte.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministradorEmpresaOuPlataforma } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.post('/assistente', consultarAssistente);
router.get('/tickets', obterTickets);
router.post('/tickets', abrirTicket);
router.get('/tickets/:id', obterTicket);
router.post('/tickets/:id/mensagens', enviarMensagem);
router.patch('/tickets/:id/estado', mudarEstado);
router.get('/gestores', exigirAdministradorEmpresaOuPlataforma, obterGestores);
router.patch('/tickets/:id/atribuir', exigirAdministradorEmpresaOuPlataforma, atribuir);

export default router;
