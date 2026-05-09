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
// Importamos el middleware de permisos
import { permitirRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * RUTAS DE LECTURA (ADMIN y PRODUCCION)
 * El auxiliar necesita estas para generar el "Reporte Colectivo" que mostraste.
 */
router.get('/:id_producto', getVersionesByProducto);
router.get('/:id_producto/ultima', getUltimaVersion);
router.get('/version/:id_version/ingredientes', getIngredientesByVersion);
router.get('/reporte/:id_version', getReporteCompletoVersion);
router.get('/historial/todos', getHistorialCompleto);

/**
 * RUTAS DE ESCRITURA (SOLO ADMIN)
 * Aquí bloqueamos al auxiliar para que no pueda alterar la base de datos.
 */
router.post('/', permitirRoles('ADMIN'), createVersionFormula);
router.put('/:id_producto', permitirRoles('ADMIN'), actualizarVersionActual);

export default router;