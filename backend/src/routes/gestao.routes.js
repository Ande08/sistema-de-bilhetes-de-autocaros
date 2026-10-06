import { Router } from 'express';
import { actualizarUtilizador, actualizarViagem, criarAutocarro, criarRota, criarUtilizador, criarViagem, definirEstadoAutocarro, definirEstadoPassageiro, definirEstadoRota, obterPainel, redefinirSenhaUtilizador } from '../controllers/gestao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';
import { exigirAdministrador } from '../middlewares/autorizacao.middleware.js';
import { auditarOperacaoAdministrativa } from '../middlewares/auditoria.middleware.js';
import { iniciarWhatsApp, obterEstadoWhatsApp } from '../controllers/whatsapp.controller.js';

const router = Router();
router.use(exigirAutenticacao, exigirAdministrador);
router.use(auditarOperacaoAdministrativa);
router.get('/painel', obterPainel);
router.get('/whatsapp/estado', obterEstadoWhatsApp);
router.post('/whatsapp/iniciar', iniciarWhatsApp);
router.post('/autocarros', criarAutocarro);
router.patch('/autocarros/:id/estado', definirEstadoAutocarro);
router.post('/rotas', criarRota);
router.patch('/rotas/:id/estado', definirEstadoRota);
router.post('/viagens', criarViagem);
router.put('/viagens/:id', actualizarViagem);
router.post('/utilizadores', criarUtilizador);
router.put('/utilizadores/:id', actualizarUtilizador);
router.put('/utilizadores/:id/palavra-passe', redefinirSenhaUtilizador);
router.patch('/utilizadores/:id/estado', definirEstadoPassageiro);
router.patch('/passageiros/:id/estado', definirEstadoPassageiro);

export default router;
