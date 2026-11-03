import { Router } from 'express';
import { abrirTicket, atribuir, consultarAssistente, enviarMensagem, mudarEstado, obterGestores, obterTicket, obterTickets, pesquisarBilhetes } from '../controllers/suporte.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministradorEmpresa } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.post('/assistente', consultarAssistente);
router.get('/bilhetes/pesquisar', pesquisarBilhetes);
router.get('/tickets', obterTickets);
router.post('/tickets', abrirTicket);
router.get('/tickets/:id', obterTicket);
router.post('/tickets/:id/mensagens', enviarMensagem);
router.patch('/tickets/:id/estado', mudarEstado);
router.get('/gestores', exigirAdministradorEmpresa, obterGestores);
router.patch('/tickets/:id/atribuir', exigirAdministradorEmpresa, atribuir);

export default router;
