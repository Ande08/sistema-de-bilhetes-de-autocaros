import { Router } from 'express';
import { actualizarPerfil, alterarPalavraPasse, confirmarRecuperacao, confirmarRegisto, iniciarSessao, obterPerfil, solicitarOtpAlteracaoPalavraPasse, solicitarOtpAlteracaoPerfil, solicitarRecuperacao, solicitarRegisto } from '../controllers/autenticacao.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.post('/solicitar-registo', solicitarRegisto);
router.post('/confirmar-registo', confirmarRegisto);
router.post('/solicitar-recuperacao', solicitarRecuperacao);
router.post('/confirmar-recuperacao', confirmarRecuperacao);
router.post('/iniciar-sessao', iniciarSessao);
router.get('/perfil', exigirAutenticacao, obterPerfil);
router.post('/perfil/solicitar-otp', exigirAutenticacao, solicitarOtpAlteracaoPerfil);
router.put('/perfil', exigirAutenticacao, actualizarPerfil);
router.post('/palavra-passe/solicitar-otp', exigirAutenticacao, solicitarOtpAlteracaoPalavraPasse);
router.put('/palavra-passe', exigirAutenticacao, alterarPalavraPasse);

export default router;
