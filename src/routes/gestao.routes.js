import { Router } from 'express';
import { criarAutocarro, criarRota, criarViagem } from '../controllers/gestao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministrador } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao, exigirAdministrador);
router.post('/autocarros', criarAutocarro);
router.post('/rotas', criarRota);
router.post('/viagens', criarViagem);

export default router;
