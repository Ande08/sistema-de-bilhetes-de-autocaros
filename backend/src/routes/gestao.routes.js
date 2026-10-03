import { Router } from 'express';
import { actualizarViagem, criarAutocarro, criarRota, criarViagem, definirEstadoAutocarro, definirEstadoPassageiro, definirEstadoRota, obterPainel } from '../controllers/gestao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministrador } from '../middlewares/autorizacao.middleware.js';

const router = Router();
router.use(exigirAutenticacao, exigirAdministrador);
router.get('/painel', obterPainel);
router.post('/autocarros', criarAutocarro);
router.patch('/autocarros/:id/estado', definirEstadoAutocarro);
router.post('/rotas', criarRota);
router.patch('/rotas/:id/estado', definirEstadoRota);
router.post('/viagens', criarViagem);
router.put('/viagens/:id', actualizarViagem);
router.patch('/passageiros/:id/estado', definirEstadoPassageiro);

export default router;
