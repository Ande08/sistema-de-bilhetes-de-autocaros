import { Router } from 'express';
import { actualizarPerfil, alterarPalavraPasse, confirmarRegisto, iniciarSessao, obterPerfil, solicitarRegisto } from '../controllers/autenticacao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.post('/solicitar-registo', solicitarRegisto);
router.post('/confirmar-registo', confirmarRegisto);
router.post('/iniciar-sessao', iniciarSessao);
router.get('/perfil', exigirAutenticacao, obterPerfil);
router.put('/perfil', exigirAutenticacao, actualizarPerfil);
router.put('/palavra-passe', exigirAutenticacao, alterarPalavraPasse);

export default router;
