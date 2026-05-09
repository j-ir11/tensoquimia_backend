import express from 'express';
import {
  getHistorialTC,
  getTCActual,
  actualizarTipoCambioMasivo
} from '../controllers/tcController.js';
import { permitirRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getHistorialTC);
// En src/routes/tcRoutes.js
router.get('/actual', getTCActual); // El auxiliar PUEDE leerlo para ver precios
router.post('/actualizar-masivo', permitirRoles('ADMIN'), actualizarTipoCambioMasivo); // SOLO ADMIN cambia la BD

export default router;