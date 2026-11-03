import { Router } from 'express';
import { avaliarEmpresa, listarEmpresas, listarLocalidades, obterEmpresaPublica } from '../controllers/catalogo.controller.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.middleware.js';

const router = Router();
router.get('/localidades', listarLocalidades);
router.get('/empresas', listarEmpresas);
router.post('/empresas/:id/avaliacoes', exigirAutenticacao, avaliarEmpresa);
router.get('/empresas/:slug', obterEmpresaPublica);

export default router;
