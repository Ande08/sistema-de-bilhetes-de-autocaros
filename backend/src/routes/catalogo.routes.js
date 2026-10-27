import { Router } from 'express';
import { listarEmpresas, listarLocalidades } from '../controllers/catalogo.controller.js';

const router = Router();
router.get('/localidades', listarLocalidades);
router.get('/empresas', listarEmpresas);

export default router;
