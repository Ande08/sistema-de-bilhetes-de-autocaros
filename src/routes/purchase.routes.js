import { Router } from 'express';
import { createPurchase, getTicket } from '../controllers/purchase.controller.js';

const router = Router();
router.post('/', createPurchase);
router.get('/ticket/:code', getTicket);

export default router;
