import { Router } from 'express';
import { iniciarPagamentoSimulado, processarPagamentoSimulado } from '../controllers/pagamento-simulado.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirClienteOuOperadorEmpresa } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao, exigirClienteOuOperadorEmpresa);
router.post('/', iniciarPagamentoSimulado);
router.post('/:referencia/processar', processarPagamentoSimulado);

export default router;
