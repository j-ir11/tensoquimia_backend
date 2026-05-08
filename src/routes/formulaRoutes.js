import express from 'express';
import {
  getVersionesByProducto,
  createVersionFormula,
  getUltimaVersion,
  getIngredientesByVersion,
  actualizarVersionActual,
  getReporteCompletoVersion,
  getHistorialCompleto
} from '../controllers/formulaController.js';

const router = express.Router();

router.get('/:id_producto', getVersionesByProducto);
router.get('/:id_producto/ultima', getUltimaVersion);
router.get('/version/:id_version/ingredientes', getIngredientesByVersion);
router.put('/:id_producto', actualizarVersionActual);
router.post('/', createVersionFormula);
router.get('/reporte/:id_version', getReporteCompletoVersion);
router.get('/historial/todos', getHistorialCompleto);

export default router;