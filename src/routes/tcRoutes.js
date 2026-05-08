import express from 'express';
import {
  getHistorialTC,
  getTCActual,
  actualizarTipoCambioMasivo
} from '../controllers/tcController.js';

const router = express.Router();

router.get('/', getHistorialTC);
router.get('/actual', getTCActual);
router.post('/actualizar-masivo', actualizarTipoCambioMasivo);

export default router;