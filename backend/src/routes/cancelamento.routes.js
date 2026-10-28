import { Router } from 'express';
import { cancelarBilheteController, cancelarViagemController } from '../controllers/cancelamento.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministradorEmpresa } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao);
router.patch('/bilhetes/:codigo/cancelar', cancelarBilheteController);
router.patch('/viagens/:id/cancelar', exigirAdministradorEmpresa, cancelarViagemController);

export default router;
