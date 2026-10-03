import { Router } from 'express';
import { getTrip, listTrips } from '../controllers/trip.controller.js';

const router = Router();
router.get('/', listTrips);
router.get('/:id', getTrip);

export default router;
